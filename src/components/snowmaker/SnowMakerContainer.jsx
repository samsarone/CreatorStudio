import React, {useEffect}  from 'react';
import OverflowContainer from '../common/OverflowContainer.tsx';
import { useColorMode } from '../../contexts/ColorMode.jsx';
import SnowMaker from './SnowMaker.jsx';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getHeaders } from '../../utils/web';
const API_SERVER = import.meta.env.VITE_PROCESSOR_API;


export default function SnowMakerContainer() {
  const { id } = useParams();
  const navigate = useNavigate();


    useEffect(() => {
  
      if (!id) {
        const headers = getHeaders();
        axios.post(`${API_SERVER}/vidgenie/create_blank`, {}, headers).then(function (response) {
          const {sessionId} = response.data;
          navigate(`/infovidcreator/${sessionId}`);
        });
      }
    }, []);



  const { colorMode } = useColorMode();

  const bgColor = colorMode === 'dark' ? 'bg-gray-900' : 'bg-gray-100';
  return (
    <div className={`${bgColor}`}>
      <OverflowContainer>
        <div className='container m-auto'>
          <SnowMaker />
        </div>
      </OverflowContainer>
    </div>
  )
}