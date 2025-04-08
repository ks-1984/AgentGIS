import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';

const PopUpTable = ({popUpTableData}) => {
    console.log("popUpTableData: ", popUpTableData);
    if (!popUpTableData || !popUpTableData.data || Object.keys(popUpTableData.data).length === 0) {
        console.log("return null");
        return null;
    }

    const dataArray = Array.isArray(popUpTableData.data) ? popUpTableData.data : [popUpTableData.data];
    const headers = Object.keys(dataArray[0] || {});

    return (
      <TableContainer component={Paper}>
      <Table sx={{ minWidth: 650 }} size="small" aria-label="simple table">
        <TableHead style={{backgroundColor: 'lightgray'}}>
          <TableRow>
            {headers && headers.length > 0 && headers.map((header, index) => (
              <TableCell align={index === 0 ? 'left' : 'right'} key={header}>{header}</TableCell>  
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {dataArray && dataArray.length > 0 && dataArray.map((row, index) => (
            <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
              {headers.map((header) => (
                <TableCell key={`${index}-${header}`}>
                  {row[header] !== undefined && row[header] !== null
                    ? row[header].toString()
                    : ''}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>  
    );
}

export default PopUpTable;