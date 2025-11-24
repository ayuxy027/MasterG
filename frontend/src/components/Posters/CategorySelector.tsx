import React, { useState } from 'react';

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface CategorySelectorProps {
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({ 
  selectedCategory, 
  setSelectedCategory 
}) => {
  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  const [showInput, setShowInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const defaultCategories: Category[] = [
    { id: 'science', name: 'Science' },
    { id: 'math', name: 'Mathematics' },
    { id: 'history', name: 'History' },
  ];

  const allCategories = [...defaultCategories, ...customCategories];

  const addCustomCategory = () => {
    if (newCategoryName.trim() !== '') {
      const newCategory = {
        id: newCategoryName.toLowerCase().replace(/\s+/g, '-'),
        name: newCategoryName,
        icon: 'custom'
      };
      setCustomCategories([...customCategories, newCategory]);
      setSelectedCategory(newCategory.id);
      setNewCategoryName('');
      setShowInput(false);
    }
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-4">Select Category</label>
      <div className="flex flex-wrap gap-3">
        {allCategories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
              selectedCategory === category.id
                ? 'bg-orange-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {category.id === 'science' && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            )}
            {category.id === 'math' && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            )}
            {category.id === 'history' && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span className="text-sm font-medium">{category.name}</span>
          </button>
        ))}
        <button
          onClick={() => setShowInput(!showInput)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
            selectedCategory === 'custom'
              ? 'bg-orange-500 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span className="text-sm font-medium">Custom</span>
        </button>
        {showInput && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="New category"
              className="border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addCustomCategory();
                } else if (e.key === 'Escape') {
                  setShowInput(false);
                }
              }}
            />
            <button
              onClick={addCustomCategory}
              className="bg-orange-500 text-white rounded-full p-2 hover:bg-orange-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button
              onClick={() => setShowInput(false)}
              className="bg-gray-300 text-gray-700 rounded-full p-2 hover:bg-gray-400"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategorySelector;