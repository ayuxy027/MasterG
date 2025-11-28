import React from 'react';

interface Material {
  id: number;
  title: string;
  subject: string;
  grade: string;
  content: string;
  keywords: string[];
}

interface MaterialsTabProps {
  language?: string;
  model?: string;
  tone?: string;
}

const MaterialsTab: React.FC<MaterialsTabProps> = () => {
  const mockMaterials: Material[] = [
    { 
      id: 1, 
      title: 'Photosynthesis Process', 
      subject: 'Biology', 
      grade: 'Class 10', 
      content: 'Detailed explanation of how plants convert sunlight into energy, including the role of chlorophyll...', 
      keywords: ['photosynthesis', 'chlorophyll', 'glucose', 'sunlight'] 
    },
    { 
      id: 2, 
      title: 'Algebra Basics', 
      subject: 'Mathematics', 
      grade: 'Class 8', 
      content: 'Fundamental concepts of algebra including variables, equations, and solving quadratic equations...', 
      keywords: ['algebra', 'equations', 'variables', 'polynomials'] 
    },
    { 
      id: 3, 
      title: 'India\'s Independence', 
      subject: 'History', 
      grade: 'Class 12', 
      content: 'Detailed analysis of India\'s struggle for independence, including the freedom fighters and key events...', 
      keywords: ['independence', 'freedom', 'history', 'freedom fighters'] 
    },
  ];

  return (
    <div>
      {mockMaterials.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
          </div>
          <p className="text-gray-600">No materials generated yet. Upload a document to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {mockMaterials.map((material) => (
            <div key={material.id} className="bg-white rounded-xl border-2 border-orange-200 overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:border-orange-300">
              <div className="bg-orange-50 p-4 sm:p-5 border-b-2 border-orange-200">
                <h4 className="font-semibold text-gray-800 text-base sm:text-lg mb-3">{material.title}</h4>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full border border-orange-200 font-medium">{material.subject}</span>
                  <span className="text-xs bg-white text-orange-600 px-2.5 py-1 rounded-full border border-orange-200 font-medium">{material.grade}</span>
                </div>
              </div>
              <div className="p-4 sm:p-5">
                <p className="text-sm sm:text-base text-gray-700 mb-4 leading-relaxed">{material.content}</p>
                <div className="flex flex-wrap gap-2">
                  {material.keywords.map((keyword, idx) => (
                    <span key={idx} className="text-xs bg-orange-50 text-orange-700 px-2.5 py-1 rounded-full border border-orange-200 font-medium">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MaterialsTab;