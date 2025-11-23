import { Agent, run, tool } from '@openai/agents';
import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

const getWeather = tool({
  name: 'get_weather',
  description: 'Return the weather for a given city.',
  parameters: z.object({ city: z.string() }),
  async execute({ city }) {
    return `The weather in ${city} is sunny.`;
  },
});

const agent = new Agent({
  name: 'Weather bot',
  instructions: 'You are a helpful weather bot.',
  model: 'gpt-4o-mini',
  tools: [getWeather],
});

run(agent, 'What is the weather in Tokyo?').then((result) => {
  console.log(result.finalOutput);
});