import React, { useState, useEffect } from 'react';
import '../styles/PopUpTable.css';

const PopUpTable = ({popUpTableData, onClose}) => {
    const [headers, setHeaders] = useState({});
    const [dataArray, setDataArray] = useState([]);
    const [title, setTitle] = useState([]);

    useEffect(() => {
        if (!popUpTableData || !popUpTableData.data || Object.keys(popUpTableData.data).length === 0) {
            onClose();
            return;
        }

        const data = Array.isArray(popUpTableData.data) ? popUpTableData.data : [popUpTableData.data];
        setTitle(popUpTableData['sql_query'] && String(popUpTableData['sql_query']).includes('FROM landtitle') ? 'Land Title': '');
        setDataArray(data);
        setHeaders(Object.keys(data[0] || {}));
    }, [popUpTableData]);

    return (
      <div className="popup-overlay">
        <div className="popup-table-container">
          <div className="popup-header">
            <h2>{title}</h2>
            <button className="close-button" onClick={onClose}>
              &times;
            </button>
          </div>
          <table>
            <thead>
              <tr>
                {headers && headers.length > 0 && headers.map((header) => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataArray && dataArray.length > 0 && dataArray.map((row, index) => (
                <tr key={index}>
                  {headers.map((header) => (
                    <td key={`${index}-${header}`}>
                      {row[header] !== undefined && row[header] !== null
                        ? row[header].toString()
                        : ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
}

export default PopUpTable;