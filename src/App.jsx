import React, { useEffect, useState, useMemo, useCallback } from 'react';

const DynamicTable = ({ data }) => {
  // Memoize the column headers to avoid recalculating them on every render
  const headers = useMemo(() => {
    return Object.keys(data[0] || {});
  }, [data]);
  console.log(data);
  

  return (
    <table className="table-auto border-collapse border border-gray-300 w-full">
      <thead>
        <tr>
          {headers.map((col, index) => (
            <th key={index} className="border border-gray-300 px-4 py-2 text-left bg-gray-100">
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {headers.map((col, colIndex) => (
              <td key={colIndex} className="border border-gray-300 px-4 py-2">
                {row[col]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const App = () => {
  const [Data, setData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 100;  // Adjust the number of rows per page as needed

  useEffect(() => {
    fetch('http://localhost:8000/dashboard')
      .then((ret) => ret.json())
      .then((data) => {
      
      // Sort the list based on highTime (ascending order)
        data['data'].sort((a, b) =>  new Date(b['highTime']) - new Date(a['highTime']) );
        console.log(data['data'])
        setData(data['data']);
      });
  }, []);

  useEffect(() => {
    // Create a new EventSource
    const eventSource = new EventSource('http://localhost:8000/events');

    // Set up an event listener for messages from the server
    eventSource.onmessage = (event) => {
      let str = event.data.split("data: ")[1]
      let validJsonString = str.replace(/'/g, '"');

      // Step 2: Remove the trailing comma (if present)
      validJsonString = validJsonString.replace(/,\s*$/, '');

      // Step 3: Parse the string into a JavaScript object
      try {
        const jsonObject = JSON.parse(validJsonString);
        let list2 = {};  // Make sure list2 is declared outside of the setData callback

        // Populate list2 with data
        for (let ob of jsonObject) {
          let id = ob[0];
          let key = ob[1];
          let val = ob[2];

          // Check for keys 'highTime' and 'lowTime'
          if (['highTime', 'lowTime'].includes(key)) {
            const date = new Date(val * 1000);
            val = date.toISOString();
          }

          // Populate list2
          if (!(id in list2)) {
            list2[id] = { [key]: val };
          } else {
            list2[id] = { ...list2[id], [key]: val };
          }
        }

        // Update state with merged data
        setData((dt) => {
          let list1 = [...dt];  // Spread to make a copy of the current state

          // Merge data from list2 into list1
          const mergedListEfficient = list1.map((item1) => {
            const matchingItem = list2[item1.id];  // Access list2 here
            return matchingItem ? { ...item1, ...matchingItem } : item1;
          });

          // Return the updated list
          // console.log(mergedListEfficient );
         
        
        // Sort the list based on highTime (ascending order)
        mergedListEfficient.sort((a, b) =>  new Date(b['highTime']) - new Date(a['highTime']) )
        console.log(mergedListEfficient);
        
          
          return mergedListEfficient;
        });
      } catch (error) {
        console.error("Invalid JSON:", error);
      }
      // console.log('New message received:',JSON.parse(str));

    };

    // Optional: Handle open and error events
    eventSource.onopen = () => {
      console.log('Connection to server established.');
    };

    eventSource.onerror = (error) => {
      console.error('Error occurred:', error);
      eventSource.close(); // Close the connection if there's an error
    };

    // Clean up on component unmount
    return () => {
      eventSource.close();
    };
  }, []);



  // Memoize current data calculation
  const currentData = useMemo(() => {
    return Data.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  }, [Data, currentPage, rowsPerPage]);

  // Memoize page handlers
  const handleNextPage = useCallback(() => {
    if (currentPage < Math.ceil(Data.length / rowsPerPage)) {
      setCurrentPage(currentPage + 1);
    }
  }, [currentPage, Data.length, rowsPerPage]);

  const handlePreviousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  }, [currentPage]);

  return (
    <div className="p-4">
      <div className="mt-4 flex justify-between">
        <button
          onClick={handlePreviousPage}
          className="px-4 py-2 bg-blue-500 text-white"
          disabled={currentPage === 1}
        >
          Previous
        </button>
        <span>
          Page {currentPage} of {Math.ceil(Data.length / rowsPerPage)}
        </span>
        <button
          onClick={handleNextPage}
          className="px-4 py-2 bg-blue-500 text-white"
          disabled={currentPage === Math.ceil(Data.length / rowsPerPage)}
        >
          Next
        </button>
      </div>
      {Data.length > 0 ?<DynamicTable data={currentData} /> : <p className="text-center">Loading...</p>}
    </div>
  );
};

export default App;
