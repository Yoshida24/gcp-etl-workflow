const functions = require('@google-cloud/functions-framework');
const { Storage } = require('@google-cloud/storage');
const storage = new Storage();

const MODEL = 'text-embedding-3-large';
const API_URL = 'https://api.openai.com/v1/embeddings';

async function embedding(text, openai_apikey) {
    // トークン数を超える場合、先頭から2048文字を取る
    const truncatedText = text.length > 2048 ? text.slice(0, 2048) : text;

    const requestBody = {
        input: truncatedText,
        model: MODEL
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openai_apikey}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.data[0].embedding;

    } catch (error) {
        console.error('Error fetching embedding:', error);
        throw error;
    }
}

functions.http('vectorizeJsonFile', async (req, res) => {
    const { bucket, name, openai_apikey } = req.body;
    console.log(`start vectorize: {bucket: ${bucket}, name: ${name}}`);

    try {
        const file = storage.bucket(bucket).file(name);
        const [contents] = await file.download();
        const jsonContent = JSON.parse(contents.toString());

        const output = {
            id: jsonContent.id,
            title: jsonContent.title,
            content: jsonContent.content,
            url: jsonContent?.url,
            titleVector: await embedding(jsonContent.title, openai_apikey),
            contentVector: await embedding(jsonContent.content, openai_apikey),
        };

        console.log(`successed to vectorize: {bucket: ${bucket}, name: ${name}}`);
        res.status(200).send(output);
    } catch (error) {
        console.log(`failed to vectorize: {bucket: ${bucket}, name: ${name}}`);
        res.status(500).send({ error: 'Unable to read the JSON file from GCS' });
        throw error;
    }
});
