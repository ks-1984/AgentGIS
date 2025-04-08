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
    const response = await axios.post(
      `http://localhost:8000/ask`,
      {
        question: messages[messages.length - 1].content
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        mode: 'no-cors',
        withCredentials: false,
        credentials: 'same-origin',
      }
    );

    const aiMessage = response.data;
    
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