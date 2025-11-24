import React from 'react';

interface GenerationResultsProps {
  isGenerating: boolean;
  selectedCategory: string;
  numImages?: number;  // Optional prop to control number of images
}

const GenerationResults: React.FC<GenerationResultsProps> = ({ isGenerating, selectedCategory, numImages = 3 }) => {
  // Generate mock images based on the number requested
  const mockImages = Array.from({ length: numImages }, (_, index) => ({
    id: index + 1,
    url: `https://placehold.co/400x300/FF6B35/FFFFFF?text=Educational+Poster+${index + 1}`,
  }));

  const getSystemFeatures = () => {
    return [
      { 
        title: 'Multilingual Support', 
        desc: 'Supports 22+ Indian languages', 
        icon: '🌐' 
      },
      { 
        title: 'Cultural Context', 
        desc: 'Relevant to Indian educational themes', 
        icon: '🎨' 
      },
      { 
        title: 'Subject Specific', 
        desc: 'Tailored for different educational subjects', 
        icon: '🎯' 
      },
      { 
        title: 'Accessibility', 
        desc: 'High contrast and visual clarity', 
        icon: '♿' 
      }
    ];
  };

  // Determine grid columns based on number of images
  const getGridClass = () => {
    if (numImages === 1) return 'grid-cols-1';
    if (numImages === 2) return 'grid-cols-1 md:grid-cols-2';
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'; // Default for 3 or more
  };

  return (
    <div className="bg-orange-100 rounded-2xl shadow-lg overflow-hidden border border-orange-200">
      <div className="p-6 border-b border-orange-200 bg-white">
        <h3 className="text-xl font-bold text-orange-800">Generated Educational Posters</h3>
        <p className="text-gray-600">{numImages} poster grid layout for effective learning</p>
      </div>
      
      {isGenerating ? (
        <div className="p-16 text-center bg-gradient-to-b from-orange-50 to-beige-50">
          <div className="flex justify-center mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-orange-500"></div>
          </div>
          <h4 className="text-xl font-bold text-orange-800 mb-3">Generating your educational visuals...</h4>
          <p className="text-gray-700 text-lg">Our AI is creating contextual images relevant to {selectedCategory} in Indian educational context</p>
        </div>
      ) : (
        <div className="p-8">
          <div className={`grid ${getGridClass()} gap-8`}>
            {mockImages.map((image) => (
              <div key={image.id} className="group relative overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <img 
                  src={image.url} 
                  alt={`Generated educational poster ${image.id}`} 
                  className="w-full h-72 object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-5">
                  <div>
                    <h4 className="text-white font-bold text-lg">Educational Poster #{image.id}</h4>
                    <p className="text-orange-200 text-sm">Click to download</p>
                  </div>
                </div>
                <button className="absolute top-5 right-5 bg-orange-500 text-white rounded-full p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-orange-600 transform hover:scale-105">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                  </svg>
                </button>
              </div>
            ))}
          </div>
          
          <div className="mt-12">
            <h4 className="text-xl font-bold text-orange-800 mb-6">Features of our <span className="text-orange-600">Image Generation</span> System:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {getSystemFeatures().map((feature, index) => (
                <div 
                  key={index} 
                  className="bg-white p-6 rounded-xl shadow-sm border border-orange-200 hover:shadow-md transition-shadow duration-300"
                >
                  <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center mb-5">
                    <span className="text-2xl">{feature.icon}</span>
                  </div>
                  <h5 className="font-bold text-orange-800 text-lg mb-2">{feature.title}</h5>
                  <p className="text-gray-600">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GenerationResults;