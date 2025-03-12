import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
    const yahooApiKey = env.VITE_YAHOO_LOCAL_SEARCH_API_KEY;

    if (!yahooApiKey) {
        return json({ error: 'API key is not configured' }, { status: 500 });
    }

    // クエリパラメータを取得
    const lat = url.searchParams.get('lat');
    const lon = url.searchParams.get('lon');
    const dist = url.searchParams.get('dist') || '1000';
    const results = url.searchParams.get('results') || '5';
    const gc = url.searchParams.get('gc') || '0105,0107';

    if (!lat || !lon) {
        return json({ error: 'Missing required parameters: lat and lon' }, { status: 400 });
    }

    try {
        // Yahoo!ローカルサーチAPIにリクエストを送信
        const yahooUrl = new URL('https://map.yahooapis.jp/search/local/V1/localSearch');
        yahooUrl.searchParams.append('appid', yahooApiKey);
        yahooUrl.searchParams.append('lat', lat);
        yahooUrl.searchParams.append('lon', lon);
        yahooUrl.searchParams.append('dist', dist);
        yahooUrl.searchParams.append('results', results);
        yahooUrl.searchParams.append('sort', 'dist');
        yahooUrl.searchParams.append('output', 'json');
        yahooUrl.searchParams.append('gc', gc);

        const response = await fetch(yahooUrl.toString());

        if (!response.ok) {
            return json(
                { error: `Yahoo API responded with status: ${response.status}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return json(data);
    } catch (error) {
        console.error('Error fetching Yahoo! Local Search API:', error);
        return json({ error: 'Failed to fetch data from Yahoo API' }, { status: 500 });
    }
};