import React from 'react';

export const Button = ({ className, variant = 'default', ...props }) => {

  return (
    <button
    className="flex items-center px-4 py-2 text-sm text-white font-medium border rounded-md shadow-sm bg-blue-500 hover:bg-blue-600"
    // onClick={() => setIsOpen(!isOpen)}
    {...props}
  >
    
  </button>
    // <button
    //   className={`${baseStyles} ${variantStyles[variant]} ${className}`}
    //   {...props}
    // />
  );
};

