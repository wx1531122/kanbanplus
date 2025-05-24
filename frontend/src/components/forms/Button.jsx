import React from 'react';

const Button = ({ children, onClick, type = 'button', disabled = false, variant = 'primary', ...props }) => {
  // Basic styling, can be expanded with different variants (primary, secondary, etc.)
  const baseStyle = {
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
    textAlign: 'center',
    textDecoration: 'none',
    display: 'inline-block',
    transition: 'background-color 0.2s ease-in-out, opacity 0.2s ease-in-out',
  };

  const variantStyles = {
    primary: {
      backgroundColor: '#007bff',
      color: 'white',
    },
    secondary: {
      backgroundColor: '#6c757d',
      color: 'white',
    },
    danger: {
      backgroundColor: '#dc3545',
      color: 'white',
    }
    // Add more variants as needed
  };

  const disabledStyle = {
    opacity: 0.65,
    cursor: 'not-allowed',
  };

  const style = {
    ...baseStyle,
    ...(variantStyles[variant] || variantStyles.primary), // Default to primary if variant is unknown
    ...(disabled ? disabledStyle : {}),
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={style}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
