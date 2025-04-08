import axios from 'axios';

export const sendMessageToAI = async ({ messages, apiSettings }) => {
  try {
    const response = await axios.post(
      `${apiSettings.baseUrl}/chat/completions`,
      {
        model: apiSettings.model,
        messages: [
          {
            role: 'system',
            content: `You are a geospatial AI assistant that helps users discover and analyze land data in Kota Kinabalu, Sabah. 
            You have access to vector data (land parcels, roads, POIs), raster data (satellite imagery), 
            and textual datasets with information on land titles, applications, revenue, etc. 
            When responding to queries about maps or locations, format your response in a way that can be processed by the map interface.
            If the user asks to display or show something on a map, include a JSON object with the relevant data.`
          },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 800
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiSettings.apiKey}`
        }
      }
    );

    const aiMessage = response.data.choices[0].message.content;
    
    // Parse response for possible map data
    let mapData = null;
    let infoData = null;
    
    // Try to extract JSON from the response for map rendering
    const jsonMatch = aiMessage.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        const extractedData = JSON.parse(jsonMatch[1]);
        
        if (extractedData.type === 'geojson' || 
            extractedData.type === 'polygon' || 
            extractedData.type === 'marker' ||
            extractedData.type === 'heatmap') {
          mapData = extractedData;
        }
        
        if (extractedData.infoPanel) {
          infoData = extractedData.infoPanel;
        }
        
        // Clean up the message by removing the JSON code block
        const cleanedMessage = aiMessage.replace(/```json\n[\s\S]*?\n```/, '');
        
        return {
          text: cleanedMessage.trim(),
          mapData,
          infoData
        };
      } catch (error) {
        console.error('Failed to parse JSON in AI response:', error);
      }
    }
    
    // If no JSON was successfully extracted, return the original message
    return {
      text: aiMessage,
      mapData,
      infoData
    };
  } catch (error) {
    console.error('Error in AI service:', error);
    throw new Error(error.response?.data?.error?.message || error.message || 'Failed to communicate with AI service');
  }
};

export const sendMessageToFastApi = async ({ messages }) => {
  try {
    // const response = await axios.post(
    //   `http://localhost:8000/ask`,
    //   {
    //     question: messages[messages.length - 1].content
    //   },
    //   {
    //     headers: {
    //       'Access-Control-Allow-Origin': '*',
    //       'Content-Type': 'application/json',
    //     },
    //     mode: 'no-cors',
    //     withCredentials: false,
    //     credentials: 'same-origin',
    //   }
    // );

    // const aiMessage = response.data;
    const aiMessage = {
      "sql_query": "SELECT * FROM landtitle LIMIT 1",
      "data": [
        {
          "id": 777161,
          "title_no": "173129569",
          "type": "Native Title(NT)",
          "current_due": 7.1,
          "arrears": 12.07,
          "area": 57222.54977880001,
          "date_registered": "1980-12-19T16:00:00+00:00",
          "expire_date": null,
          "term_year": 0,
          "geom": "0106000020E6100000010000000103000000010000000C000000EBE946D94FF05C409B1E6241F2B1154044CD21554DF05C4030842F00DDB11540182DC4E644F05C408F1F632CEDB115405ECFD7763BF05C40A0232CA911B215406777E9CC3EF05C40DAA8BF8680B31540ED0FA9E444F05C40E487F137B4B5154079D2BF685BF05C40C906214482B51540BB3259C155F05C405AD84EBED1B31540ECD4569653F05C406301969A41B31540575B300E53F05C401A64BB8014B31540E2ADE5A152F05C4083EC1633EEB21540EBE946D94FF05C409B1E6241F2B11540",
          "created_at": "2024-09-02T07:41:52.718983+00:00",
          "updated_at": "2024-09-02T07:41:52.718983+00:00",
          "district": "BEAUFORT",
          "division": null
        }
      ]
    }
    
    // // Parse response for possible map data
    // let mapData = null;
    // let infoData = null;
    
    // // Try to extract JSON from the response for map rendering
    // const jsonMatch = aiMessage.match(/```json\n([\s\S]*?)\n```/);
    // if (jsonMatch && jsonMatch[1]) {
    //   try {
    //     const extractedData = JSON.parse(jsonMatch[1]);
        
    //     if (extractedData.type === 'geojson' || 
    //         extractedData.type === 'polygon' || 
    //         extractedData.type === 'marker' ||
    //         extractedData.type === 'heatmap') {
    //       mapData = extractedData;
    //     }
        
    //     if (extractedData.infoPanel) {
    //       infoData = extractedData.infoPanel;
    //     }
        
    //     // Clean up the message by removing the JSON code block
    //     const cleanedMessage = aiMessage.replace(/```json\n[\s\S]*?\n```/, '');
        
    //     return {
    //       text: cleanedMessage.trim(),
    //       mapData,
    //       infoData
    //     };
    //   } catch (error) {
    //     console.error('Failed to parse JSON in AI response:', error);
    //   }
    // }
    
    // If no JSON was successfully extracted, return the original message
    return {
      text: aiMessage['sql_query'],
      // mapData,
      tableData: aiMessage
    };
  } catch (error) {
    console.error('Error in AI service:', error);
    throw new Error(error.response?.data?.error?.message || error.message || 'Failed to communicate with AI service');
  }
};