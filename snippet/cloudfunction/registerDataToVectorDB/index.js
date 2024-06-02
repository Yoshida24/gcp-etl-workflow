const functions = require('@google-cloud/functions-framework');
const { Storage } = require('@google-cloud/storage');
const storage = new Storage();

const searchServiceName = 'search-potesara24-free'; // ここにあなたの検索サービス名を入力してください
const indexName = 'documents'; // ここにあなたのインデックス名を入力してください

async function registerDosumentToSearchService(document, azure_search_service_apikey_secret_id) {
    const endpoint = `https://${searchServiceName}.search.windows.net/indexes/${indexName}/docs/index?api-version=2023-11-01`;

    const vectorData = {
        "value": [
            document,
        ]
    };

    const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'api-key': azure_search_service_apikey_secret_id
        },
        body: JSON.stringify(vectorData)
    });

    if (!res.ok) {
        const resJson = await res.json();
        throw new Error(resJson);
    }

    const resJson = await res.json();
    console.log(resJson);
    return resJson;
}

functions.http('registerDataToVectorDB', async (req, res) => {
    const { bucket, name, azure_search_service_apikey_secret_id } = req.body;
    console.log(`start register vectorized data: {bucket: ${bucket}, name: ${name}}`);

    try {
        const file = storage.bucket(bucket).file(name);
        const [contents] = await file.download();
        const jsonContent = JSON.parse(contents.toString());

        const document = {
            id: jsonContent.id,
            title: jsonContent.title,
            chunk: jsonContent.content,
            url: jsonContent?.url,
            embedding: jsonContent.contentVector
        };

        console.log(document);
        await registerDosumentToSearchService(document, azure_search_service_apikey_secret_id);
        console.log(`success to register vectorized data: {bucket: ${bucket}, name: ${name}}`);
        res.status(200).send(document);
    } catch (error) {
        console.log(`failed to register vectorized data: {bucket: ${bucket}, name: ${name}}`);
        res.status(500).send({ error: 'Unable to read the JSON file from GCS' });
        throw error;
    }
});

