const functions = require('@google-cloud/functions-framework');
const { Storage } = require('@google-cloud/storage');
const storage = new Storage();

const searchServiceName = 'search-potesara24-free'; // ここにあなたの検索サービス名を入力してください
const indexName = 'documents'; // ここにあなたのインデックス名を入力してください

async function registerDosumentToSearchService(document, azure_search_service_apikey) {
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
            'api-key': azure_search_service_apikey
        },
        body: JSON.stringify(vectorData)
    });

    const resJson = await res.json();
    const isError = resJson.value.some((value) => value.errorMessage != null)
    if (isError) {
        throw new Error(resJson);
    }

    console.log(resJson);
    return resJson;
}

functions.http('registerDataToVectorDB', async (req, res) => {
    const { bucket, name, azure_search_service_apikey } = req.body;
    console.log(`start register vectorized data: {bucket: ${bucket}, name: ${name}}`);

    try {
        const file = storage.bucket(bucket).file(name);
        const [contents] = await file.download();
        const jsonContent = JSON.parse(contents.toString());

        const truncatedChunk = jsonContent.content.length > 10000 ? jsonContent.content.slice(0, 10000) : jsonContent.content;

        const document = {
            id: jsonContent.id,
            title: jsonContent.title,
            chunk: truncatedChunk,
            url: jsonContent?.url,
            embedding: jsonContent.contentVector
        };

        await registerDosumentToSearchService(document, azure_search_service_apikey);
        console.log(`success to register vectorized data: {bucket: ${bucket}, name: ${name}}`);
        res.status(200).send(document);
    } catch (error) {
        console.log(`failed to register data: {bucket: ${bucket}, name: ${name}}`);
        console.log(error);
        res.status(500).send(`failed to register data: {bucket: ${bucket}, name: ${name}}`);
    }
});

