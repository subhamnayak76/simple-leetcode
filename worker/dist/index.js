"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const redis_1 = require("redis");
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const client = (0, redis_1.createClient)();
function processSubmission(submission) {
    return __awaiter(this, void 0, void 0, function* () {
        const { problemId, code, language } = JSON.parse(submission);
        console.log(`Processing submission for problemId ${problemId}...`);
        console.log(`Code: ${code}`);
        console.log(`Language: ${language}`);
        const tempFilePath = `./temp_user_code_${problemId}.js`;
        try {
            // Save code to a temporary file
            fs_1.default.writeFileSync(tempFilePath, code);
            // Execute the code using the node interpreter
            (0, child_process_1.exec)(`node ${tempFilePath}`, (error, stdout, stderr) => {
                // Clean up the temporary file
                fs_1.default.unlinkSync(tempFilePath);
                if (error || stderr) {
                    console.error(`Error executing code for problemId ${problemId}:`, error || stderr);
                    // Handle error response here, e.g., pushing the result back to Redis
                    client.lPush("results", JSON.stringify({ problemId, output: stderr || (error ? error.message : "Unknown error") }));
                    return;
                }
                console.log(`Output for problemId ${problemId}: ${stdout}`);
                // Handle successful result, push output to Redis
                client.lPush("results", JSON.stringify({ problemId, output: stdout }));
            });
        }
        catch (err) {
            console.error(`Failed to process submission for problemId ${problemId}:`, err);
        }
        console.log(`Finished processing submission for problemId ${problemId}.`);
    });
}
function startWorker() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield client.connect();
            console.log("Worker connected to Redis.");
            // Main loop to continuously process submissions from the Redis queue
            while (true) {
                try {
                    const submission = yield client.brPop("problems", 0);
                    yield processSubmission(submission.element);
                }
                catch (error) {
                    console.error("Error processing submission:", error);
                }
            }
        }
        catch (error) {
            console.error("Failed to connect to Redis", error);
        }
    });
}
startWorker();
