"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const agents_1 = require("@openai/agents");
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const getWeather = (0, agents_1.tool)({
    name: 'get_weather',
    description: 'Return the weather for a given city.',
    parameters: zod_1.z.object({ city: zod_1.z.string() }),
    async execute({ city }) {
        return `The weather in ${city} is sunny.`;
    },
});
const agent = new agents_1.Agent({
    name: 'Weather bot',
    instructions: 'You are a helpful weather bot.',
    model: 'gpt-4o-mini',
    tools: [getWeather],
});
(0, agents_1.run)(agent, 'What is the weather in Tokyo?').then((result) => {
    console.log(result.finalOutput);
});
