async function test() {
    const baseUrl = 'http://localhost:3000/api';
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6IkFkbWluIiwiaWF0IjoxNzcyMDIwNzUzLCJleHAiOjE3NzIxMDcxNTN9.Qs61hngyI1G72zgms7O9lpg3eaLwllFQ53tos369CIo';

    const testCases = [
        { subcategory_id: 119, framework: 'AMENITY' },
        { subcategory_id: 179, framework: 'COMMISSIONARY' },
        { subcategory_id: 186, framework: 'WSP' }
    ];

    for (const tc of testCases) {
        try {
            console.log(`Testing: subcategory_id=${tc.subcategory_id}, framework=${tc.framework}`);
            const url = new URL(`${baseUrl}/checklist`);
            Object.keys(tc).forEach(key => url.searchParams.append(key, tc[key]));

            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = await res.json();
            if (res.ok) {
                console.log(`SUCCESS: Status ${res.status}, Questions Found: ${data.length || 0}`);
            } else {
                console.log(`FAILED: Status ${res.status}`);
                console.log('Response:', JSON.stringify(data));
            }
        } catch (err) {
            console.error(`ERROR: ${err.message}`);
        }
    }
}

test();
