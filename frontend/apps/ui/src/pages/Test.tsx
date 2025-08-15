import React, { useState, useEffect } from 'react';

export default function Test() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Replace with your JWT token or handle authentication
  const jwtToken = 'your_jwt_token_here';

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Use the local Papermerge endpoint for documents (replace with your desired endpoint)
        const response = await fetch('http://127.0.0.1:8000/api/documents/', {
          method: 'GET', // GET, POST, etc. based on the action
          headers: {
            'Authorization': `Bearer ${jwtToken}`, // Add the Authorization header if required
            'Content-Type': 'application/json',
          },
        });

        // Check for any response errors
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }

        const result = await response.json();
        setData(result); // Set data to the state if successful
      } catch (error) {
        setError(error.message); // Capture errors if any
      } finally {
        setLoading(false); // Set loading to false once the fetch operation completes
      }
    };

    fetchData(); // Run fetchData when component mounts
  }, []);

  if (loading) return <p>Loading...</p>; // Display loading text while fetching data
  if (error) return <p>Error: {error}</p>; // Display error message if fetch fails

  return (
    <main>
      <h1>Documents List</h1>
      <p>This page displays documents from Papermerge.</p>
      {data ? (
        <div>
          <h2>Documents</h2>
          <div style={{ maxHeight: '400px', overflowY: 'scroll', border: '1px solid #ccc', padding: '10px' }}>
            <ul>
              {/* Render documents or data based on the structure of the response */}
              {data.map((document) => (
                <li key={document.id} style={{ marginBottom: '20px' }}>
                  <h3>{document.title}</h3>
                  <p>{document.description}</p> {/* Adjust based on actual fields from the API response */}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <p>No data available.</p>
      )}
    </main>
  );
}
