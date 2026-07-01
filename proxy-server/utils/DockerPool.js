import Docker from 'dockerode';

class DockerPool {
    constructor() {
        this.docker = new Docker(); // Defaults to /var/run/docker.sock
        this.poolSize = 5;
        this.containers = [];
        this.imageName = 'code-runner';
        this.isInitialized = false;
        this.timeout = 5; // Timeout in seconds
    }

    async initialize() {
        if (this.isInitialized) return;

        console.log(`[DockerPool] Initializing pool of ${this.poolSize} containers...`);
        
        try {
            const existingContainers = await this.docker.listContainers({ all: true });

            for (let i = 0; i < this.poolSize; i++) {
                const name = `code-runner-pool-${i}`;
                const existing = existingContainers.find(c => c.Names.some(n => n.includes(name)));
                
                let container;
                if (existing) {
                    console.log(`[DockerPool] Found existing container ${name} (${existing.Id.substring(0, 12)})`);
                    container = this.docker.getContainer(existing.Id);
                    if (existing.State !== 'running') {
                        console.log(`[DockerPool] Starting stopped container ${name}...`);
                        await container.start();
                    }
                } else {
                    console.log(`[DockerPool] Creating new container ${name}...`);
                    container = await this.docker.createContainer({
                        Image: this.imageName,
                        name: name,
                        Tty: true,
                        HostConfig: {
                            Memory: 128 * 1024 * 1024,
                            NanoCpus: 500000000,
                            NetworkMode: 'none',
                            AutoRemove: false
                        }
                    });
                    await container.start();
                }

                this.containers.push({
                    id: container.id,
                    container: container,
                    busy: false
                });
            }

            this.isInitialized = true;
            console.log('[DockerPool] Pool initialized.');
        } catch (error) {
            console.error('[DockerPool] Failed to initialize Docker pool. Code execution will be unavailable.', error.message);
        }
    }

    async execute(code, language) {
        if (!this.isInitialized) await this.initialize();

        const containerData = this.containers.find(c => !c.busy);
        if (!containerData) {
            throw new Error('No available containers in the pool.');
        }

        containerData.busy = true;
        const container = containerData.container;

        try {
            const result = await this.runCodeInContainer(container, code, language);
            return result;
        } finally {
            containerData.busy = false;
        }
    }

    async runCodeInContainer(container, code, language) {
        const startTime = Date.now();
        let fileName = '';
        let compileCmd = '';
        let runCmd = '';

        switch (language.toLowerCase()) {
            case 'python':
                fileName = 'solution.py';
                runCmd = `python3 ${fileName}`;
                break;
            case 'c':
                fileName = 'solution.c';
                compileCmd = `gcc ${fileName} -o solution`;
                runCmd = './solution';
                break;
            case 'cpp':
            case 'c++':
                fileName = 'solution.cpp';
                compileCmd = `g++ ${fileName} -o solution`;
                runCmd = './solution';
                break;
            case 'java':
                fileName = 'Main.java';
                compileCmd = `javac ${fileName}`;
                runCmd = `java Main`;
                break;
            default:
                throw new Error(`Unsupported language: ${language}`);
        }

        // Write code to file inside container
        const escapedCode = code.replace(/'/g, "'\\''");
        const writeCmd = `printf "%s" '${escapedCode}' > ${fileName}`;

        const fullCmd = compileCmd 
            ? `${writeCmd} && ${compileCmd} && timeout ${this.timeout}s ${runCmd}`
            : `${writeCmd} && timeout ${this.timeout}s ${runCmd}`;

        const exec = await container.exec({
            Cmd: ['/bin/bash', '-c', fullCmd],
            AttachStdout: true,
            AttachStderr: true
        });

        const stream = await exec.start();
        
        return new Promise((resolve, reject) => {
            let stdout = '';
            let stderr = '';

            stream.on('data', (chunk) => {
                const prefix = chunk.readUInt8(0);
                const size = chunk.readUInt32BE(4);
                const data = chunk.slice(8, 8 + size).toString();
                if (prefix === 1) stdout += data;
                else if (prefix === 2) stderr += data;
            });

            stream.on('end', async () => {
                const duration = Date.now() - startTime;
                // Cleanup files
                await container.exec({
                    Cmd: ['/bin/bash', '-c', `rm -f ${fileName} solution solution.class Main.class`]
                }).then(e => e.start());

                resolve({
                    stdout: stdout.trim(),
                    stderr: stderr.trim(),
                    duration: duration,
                    timeout: duration >= (this.timeout * 1000)
                });
            });

            stream.on('error', (err) => {
                reject(err);
            });
        });
    }

    async cleanup() {
        for (const c of this.containers) {
            try {
                console.log(`[DockerPool] Stopping container ${c.id}...`);
                await c.container.stop();
                await c.container.remove();
                console.log(`[DockerPool] Container ${c.id} removed.`);
            } catch (e) {
                console.error(`[DockerPool] Error removing container ${c.id}:`, e);
            }
        }
        this.containers = [];
        this.isInitialized = false;
    }
}

export default new DockerPool();
