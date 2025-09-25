import express from 'express';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

// Init

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

const gemini = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const app = express();

const limiter = rateLimit({
    windowMs: 45 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false
});

app.use(express.json());
app.use(limiter);

// Types

type PrimitiveString = 'string' | 'number' | 'boolean';

interface Schema {
    [key: string]: PrimitiveString | PrimitiveString[] | Schema | Schema[];
}

// Logic

async function generateAIData(schema: Schema): Promise<string | null> {
    try {
        const res = await gemini.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate dummy JSON for the following schema: ${JSON.stringify(schema)} PLEASE don't say ANYTHING, just return plain JSON string, no comments, no nothing, so i can parse it directly.`,
            config: {
                temperature: 1.2
            }
        });

        const clean = (res.text ?? '')
            .trim()
            .replace(/^```(json)?/, "")
            .replace(/```$/, "");

        const parsed = JSON.parse(clean);

        return JSON.stringify(parsed);

    } catch (err) {
        console.error(err);
        return null;
    }
}

// Route

app.post('/', async (req, res) => {

    const schema = req.body as Schema;

    if (!schema) return res.status(400).json({
        message: 'Invalid schema'
    });

    const data = await generateAIData(schema);

    if (!data) return res.status(500).json({
        message: 'Couldn\'t generate any data'
    });

    return res.status(200).json({
        message: 'Success',
        data
    });
});

// Run

app.listen(3000, () => console.log('Server is running!'));