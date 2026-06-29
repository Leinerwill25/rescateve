async function run() {
  console.log('Fetching needs from API...');
  const res = await fetch('https://ayudaencamino.com/api/needs');
  const data = await res.json();
  console.log('Response type:', typeof data, Array.isArray(data) ? 'Array' : 'Object');
  console.log('Length:', data.length);
  if (data && data.length > 0) {
    console.log('Sample item:', JSON.stringify(data[0], null, 2));
  } else {
    console.log('Empty response or non-array:', data);
  }
}
run().catch(console.error);
