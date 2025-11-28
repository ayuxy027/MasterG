import React, { useState } from 'react';
import type { PosterCategory } from '../../types/poster';

interface CategorySelectorProps {
  categories: PosterCategory[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({ 
  categories,
  selectedCategory, 
  onSelectCategory
}) => {
  const [customCategories, setCustomCategories] = useState<PosterCategory[]>([]);
  const [showInput, setShowInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const allCategories = [...categories, ...customCategories];

  const addCustomCategory = () => {
    if (newCategoryName.trim() !== '') {
      const newCategory: PosterCategory = {
        id: newCategoryName.toLowerCase().replace(/\s+/g, '-'),
        name: newCategoryName,
        description: 'Custom category',
        icon: '📝',
        examples: []
      };
      setCustomCategories([...customCategories, newCategory]);
      onSelectCategory(newCategory.id);
      setNewCategoryName('');
      setShowInput(false);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-xl border-2 border-orange-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Category</h3>
      <div className="flex flex-wrap gap-3">
        {allCategories.map((category) => (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
              selectedCategory === category.id
                ? 'bg-orange-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span className="text-xl">{category.icon}</span>
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