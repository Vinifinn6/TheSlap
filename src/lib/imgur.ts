import axios from 'axios';

// Função para fazer upload de imagem para o Imgur
export async function uploadToImgur(imageBase64: string): Promise<string> {
  try {
    // Remove o prefixo data:image/jpeg;base64, se existir
    const base64Image = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    
    const response = await axios.post(
      'https://api.imgur.com/3/image',
      {
        image: base64Image,
        type: 'base64'
      },
      {
        headers: {
          Authorization: `Client-ID ${process.env.IMGUR_CLIENT_ID}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.success) {
      return response.data.data.link;
    } else {
      throw new Error('Falha ao fazer upload da imagem para o Imgur');
    }
  } catch (error) {
    console.error('Erro ao fazer upload para o Imgur:', error);
    throw error;
  }
}

// Função para comprimir imagem antes do upload
export function compressImage(base64Image: string, maxWidth = 1200, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      // Redimensionar se a largura for maior que maxWidth
      if (width > maxWidth) {
        height = Math.floor(height * (maxWidth / width));
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Não foi possível obter o contexto do canvas'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // Converter para base64 com a qualidade especificada
      const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedBase64);
    };
    
    img.onerror = () => {
      reject(new Error('Erro ao carregar a imagem para compressão'));
    };
    
    img.src = base64Image;
  });
}

// Função para processar e fazer upload de imagens
export async function processAndUploadImage(file: File): Promise<string> {
  try {
    // Converter arquivo para base64
    const base64 = await fileToBase64(file);
    
    // Comprimir imagem (apenas no cliente)
    let compressedImage = base64;
    if (typeof window !== 'undefined') {
      compressedImage = await compressImage(base64);
    }
    
    // Fazer upload para o Imgur
    const imageUrl = await uploadToImgur(compressedImage);
    return imageUrl;
  } catch (error) {
    console.error('Erro ao processar e fazer upload da imagem:', error);
    throw error;
  }
}

// Função auxiliar para converter File para base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}
