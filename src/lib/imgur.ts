import axios from 'axios';

// Configuração do cliente Imgur
const imgurClient = {
  clientId: process.env.IMGUR_CLIENT_ID,
  clientSecret: process.env.IMGUR_CLIENT_SECRET
};

// Função para fazer upload de uma imagem para o Imgur
export async function uploadImage(imageBuffer: Buffer, filename?: string): Promise<string> {
  try {
    // Converter o buffer para base64
    const base64Image = imageBuffer.toString('base64');
    
    // Configurar os headers da requisição
    const headers = {
      Authorization: `Client-ID ${imgurClient.clientId}`
    };
    
    // Fazer a requisição para a API do Imgur
    const response = await axios.post(
      'https://api.imgur.com/3/image',
      {
        image: base64Image,
        type: 'base64',
        name: filename || 'upload.jpg',
        title: filename || 'TheSlap Upload'
      },
      { headers }
    );
    
    // Retornar a URL da imagem
    return response.data.data.link;
  } catch (error) {
    console.error('Erro ao fazer upload para o Imgur:', error);
    throw new Error('Falha ao fazer upload da imagem');
  }
}

// Função para comprimir uma imagem antes do upload
export async function compressImage(imageBuffer: Buffer, quality: number = 80): Promise<Buffer> {
  try {
    // Em um ambiente real, usaríamos uma biblioteca como sharp para compressão
    // Como exemplo simplificado, apenas retornamos o buffer original
    // Na implementação real, seria algo como:
    // const sharp = require('sharp');
    // return await sharp(imageBuffer)
    //   .jpeg({ quality })
    //   .toBuffer();
    
    console.log(`Comprimindo imagem com qualidade ${quality}%`);
    return imageBuffer;
  } catch (error) {
    console.error('Erro ao comprimir imagem:', error);
    return imageBuffer; // Retorna o buffer original em caso de erro
  }
}

export default {
  uploadImage,
  compressImage
};
