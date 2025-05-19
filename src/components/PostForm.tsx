import React, { useState, useRef } from 'react';
import { FaSmile, FaImage, FaAt } from 'react-icons/fa';
import { useUser } from '@auth0/nextjs-auth0/client';

// Tipos
interface PostFormProps {
  onSubmit: (post: {
    content: string;
    moodText: string;
    moodEmoji: string;
    images: File[];
    mentions: string[];
  }) => Promise<void>;
}

const PREDEFINED_MOODS = [
  { text: 'Feliz', emoji: '😃' },
  { text: 'Triste', emoji: '😢' },
  { text: 'Raiva', emoji: '😡' },
  { text: 'Animado', emoji: '🎉' },
  { text: 'Cansado', emoji: '😴' },
  { text: 'Apaixonado', emoji: '❤️' },
  { text: 'Confuso', emoji: '🤔' },
  { text: 'Entediado', emoji: '😒' },
];

const EMOJIS = ['😃', '😢', '😡', '🎉', '😴', '❤️', '🤔', '😒', '😎', '😂', '🥳', '😍', '🙄', '😱', '🤩', '😊', '👍', '👎', '🔥', '💯', '🌟', '💪', '🤦‍♂️', '🤦‍♀️'];

const PostForm: React.FC<PostFormProps> = ({ onSubmit }) => {
  const { user } = useUser();
  const [content, setContent] = useState('');
  const [moodType, setMoodType] = useState('predefined');
  const [selectedMood, setSelectedMood] = useState(0);
  const [customMoodText, setCustomMoodText] = useState('');
  const [customMoodEmoji, setCustomMoodEmoji] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [mentions, setMentions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    
    // Detectar menções (@username)
    const mentionRegex = /@(\w+)/g;
    const foundMentions = e.target.value.match(mentionRegex)?.map(m => m.substring(1)) || [];
    setMentions(foundMentions);
  };

  const handleMoodTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMoodType(e.target.value);
  };

  const handlePredefinedMoodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMood(parseInt(e.target.value));
  };

  const handleEmojiSelect = (emoji: string) => {
    setCustomMoodEmoji(emoji);
    setShowEmojiPicker(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newImages = Array.from(e.target.files);
      
      // Limitar a 2 imagens
      const totalImages = [...images, ...newImages].slice(0, 2);
      setImages(totalImages);
      
      // Criar previews
      const newPreviews = totalImages.map(file => URL.createObjectURL(file));
      setImagePreviews(newPreviews);
    }
  };

  const removeImage = (index: number) => {
    const updatedImages = [...images];
    updatedImages.splice(index, 1);
    setImages(updatedImages);
    
    const updatedPreviews = [...imagePreviews];
    URL.revokeObjectURL(updatedPreviews[index]);
    updatedPreviews.splice(index, 1);
    setImagePreviews(updatedPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      const moodText = moodType === 'predefined' 
        ? PREDEFINED_MOODS[selectedMood].text 
        : customMoodText;
        
      const moodEmoji = moodType === 'predefined' 
        ? PREDEFINED_MOODS[selectedMood].emoji 
        : customMoodEmoji;
      
      await onSubmit({
        content,
        moodText,
        moodEmoji,
        images,
        mentions
      });
      
      // Limpar formulário após envio
      setContent('');
      setMoodType('predefined');
      setSelectedMood(0);
      setCustomMoodText('');
      setCustomMoodEmoji('');
      setImages([]);
      setImagePreviews([]);
      setMentions([]);
    } catch (error) {
      console.error('Erro ao enviar post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-white/90 text-gray-800 rounded-lg p-4 mb-6 text-center">
        <p>Faça login para criar posts</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white/90 text-gray-800 rounded-lg p-4 mb-6">
      <div className="flex items-start mb-4">
        <img 
          src={user.picture || 'https://via.placeholder.com/50'} 
          alt={user.name || 'Usuário'} 
          className="w-12 h-12 rounded-full mr-4"
        />
        <textarea
          value={content}
          onChange={handleContentChange}
          placeholder="O que está acontecendo?"
          className="flex-1 p-3 border border-gray-300 rounded-lg resize-none h-24"
          disabled={isSubmitting}
        />
      </div>
      
      {/* Previews de imagens */}
      {imagePreviews.length > 0 && (
        <div className="image-preview mb-4">
          {imagePreviews.map((preview, index) => (
            <div key={index} className="image-preview-item">
              <img src={preview} alt={`Preview ${index + 1}`} className="image-preview-img" />
              <button 
                type="button" 
                className="image-remove" 
                onClick={() => removeImage(index)}
                disabled={isSubmitting}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex flex-wrap items-center justify-between">
        <div className="flex items-center space-x-4 mb-2 sm:mb-0">
          {/* Upload de imagens */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center text-gray-600 hover:text-orange-500"
            disabled={isSubmitting || images.length >= 2}
          >
            <FaImage className="mr-1" />
            <span>{images.length === 0 ? 'Adicionar imagem' : `${images.length}/2 imagens`}</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            multiple
            className="hidden"
            disabled={isSubmitting || images.length >= 2}
          />
          
          {/* Menções */}
          <div className="flex items-center text-gray-600">
            <FaAt className="mr-1" />
            <span>Menções: {mentions.length}</span>
          </div>
        </div>
        
        {/* Seletor de humor */}
        <div className="mood-selector mb-2 sm:mb-0">
          <span>Humor:</span>
          <select 
            value={moodType} 
            onChange={handleMoodTypeChange}
            className="mood-dropdown"
            disabled={isSubmitting}
          >
            <option value="predefined">Pré-definido</option>
            <option value="custom">Personalizado</option>
          </select>
          
          {moodType === 'predefined' ? (
            <select 
              value={selectedMood} 
              onChange={handlePredefinedMoodChange}
              className="mood-dropdown"
              disabled={isSubmitting}
            >
              {PREDEFINED_MOODS.map((mood, index) => (
                <option key={index} value={index}>
                  {mood.emoji} {mood.text}
                </option>
              ))}
            </select>
          ) : (
            <div className="mood-custom">
              <input
                type="text"
                value={customMoodText}
                onChange={(e) => setCustomMoodText(e.target.value)}
                placeholder="Humor..."
                className="mood-input"
                disabled={isSubmitting}
              />
              <div className="emoji-picker">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="emoji-button"
                  disabled={isSubmitting}
                >
                  {customMoodEmoji || <FaSmile />}
                </button>
                {showEmojiPicker && (
                  <div className="emoji-popup">
                    <div className="emoji-grid">
                      {EMOJIS.map((emoji, index) => (
                        <div
                          key={index}
                          className="emoji-item"
                          onClick={() => handleEmojiSelect(emoji)}
                        >
                          {emoji}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <button
          type="submit"
          className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded"
          disabled={isSubmitting || !content.trim()}
        >
          {isSubmitting ? 'Enviando...' : 'Publicar'}
        </button>
      </div>
    </form>
  );
};

export default PostForm;
