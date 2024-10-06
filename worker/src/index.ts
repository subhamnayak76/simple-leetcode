import { createClient } from "redis";
import { exec } from "child_process";
import fs from "fs";

const client = createClient();

async function processSubmission(submission: string) {
    const { problemId, code, language } = JSON.parse(submission);

    console.log(`Processing submission for problemId ${problemId}...`);
    console.log(`Code: ${code}`);
    console.log(`Language: ${language}`);

    const tempFilePath = `./temp_user_code_${problemId}.js`;

    try {
        
        fs.writeFileSync(tempFilePath, code);

        
        exec(`node ${tempFilePath}`, (error, stdout, stderr) => {
            
            fs.unlinkSync(tempFilePath);

            if (error || stderr) {
                console.error(`Error executing code for problemId ${problemId}:`, error || stderr);
                
                client.lPush("results", JSON.stringify({ problemId, output: stderr || (error ? error.message : "Unknown error") }));
                return;
            }

            console.log(`Output for problemId ${problemId}: ${stdout}`);
            
            client.lPush("results", JSON.stringify({ problemId, output: stdout }));
        });

    } catch (err) {
        console.error(`Failed to process submission for problemId ${problemId}:`, err);
    }

    console.log(`Finished processing submission for problemId ${problemId}.`);
}

async function startWorker() {
    try {
        await client.connect();
        console.log("Worker connected to Redis.");

        
        while (true) {
            try {
                const submission = await client.brPop("problems", 0);
                await processSubmission(submission!.element);
            } catch (error) {
                console.error("Error processing submission:", error);
            }
        }
    } catch (error) {
        console.error("Failed to connect to Redis", error);
    }
}

startWorker();
