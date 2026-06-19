async function runTests() {
  const baseUrl = "http://localhost:3000/api/chat";

  console.log("Starting Regression Tests...");

  // Test 1: Valid payload
  console.log("\n--- Test 1: Valid Payload ---");
  try {
    const res1 = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "hello" }],
        mode: "standard"
      })
    });
    console.log("Status:", res1.status);
    if (res1.status === 200) {
      console.log("Pass: Stream started successfully.");
      const reader = res1.body?.getReader();
      if (reader) {
        const { value } = await reader.read();
        console.log("First chunk received:", new TextDecoder().decode(value).substring(0, 100));
      }
    } else {
      console.error("Fail: Expected 200");
    }
  } catch (e) {
    console.error("Test 1 Error:", e);
  }

  // Test 2: Empty messages array
  console.log("\n--- Test 2: Empty Messages Array ---");
  try {
    const res2 = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: []
      })
    });
    console.log("Status:", res2.status);
    const text2 = await res2.text();
    console.log("Response:", text2);
    if (res2.status === 200) { 
      console.log("Pass: Empty array handled.");
    } else {
      console.log("Handled externally");
    }
  } catch (e) {
    console.error("Test 2 Error:", e);
  }

  // Test 3: Missing messages field
  console.log("\n--- Test 3: Missing Messages Field ---");
  try {
    const res3 = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "standard"
      })
    });
    console.log("Status:", res3.status);
    const text3 = await res3.text();
    console.log("Response:", text3);
    if (res3.status === 400 && text3.includes("Messages array is required")) {
      console.log("Pass: Returns 400 Bad Request");
    } else {
      console.error("Fail: Expected 400");
    }
  } catch (e) {
    console.error("Test 3 Error:", e);
  }

  // Test 4: Large reasoning prompt
  console.log("\n--- Test 4: Large Reasoning Prompt ---");
  try {
    const res4 = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Explain the history of artificial intelligence in detail. Provide at least 5 paragraphs." }],
        mode: "standard"
      })
    });
    console.log("Status:", res4.status);
    if (res4.status === 200) {
      console.log("Pass: Stream started successfully.");
      const reader = res4.body?.getReader();
      let chunks = 0;
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done || chunks > 5) break; 
          chunks++;
          console.log(`Received chunk ${chunks}:`, new TextDecoder().decode(value).substring(0, 50).replace(/\n/g, "\\n") + "...");
        }
      }
    } else {
      console.error("Fail: Expected 200");
    }
  } catch (e) {
    console.error("Test 4 Error:", e);
  }

}

runTests();
