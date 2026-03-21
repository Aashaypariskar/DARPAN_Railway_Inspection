async function testApi() {
    try {
        const comRes = await fetch('http://localhost:3000/api/commissionary/progress?coach_number=21225-B1');
        const comData = await comRes.json();
        console.log("=== Commissionary API Progress ===");
        console.log("Total Expected Items:", comData.total_expected);
        console.log("Completed Items:", comData.completed_count);
        console.log("Status:", comData.status);

        // Test with explicit subcategory_id assuming lavatory is 123
        const slRes = await fetch('http://localhost:3000/api/sickline/progress?coach_number=21225-B1&subcategory_id=123');
        const slData = await slRes.json();
        console.log("\n=== SickLine API Progress (Subcategory 123) ===");
        console.log(JSON.stringify(slData, null, 2));

    } catch (err) {
        console.error("Connection Error:", err.message);
    }
}

testApi();
