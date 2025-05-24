import React from 'react';

const Input = ({ label, type = 'text', name, value, onChange, placeholder, required = false, ...props }) => {
  return (
    <div style={{ marginBottom: '1rem' }}>
      {label && <label htmlFor={name} style={{ display: 'block', marginBottom: '0.25rem' }}>{label}</label>}
      <input
        type={type}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        style={{
          width: '100%',
          padding: '0.5rem',
          border: '1px solid #ccc',
          borderRadius: '4px',
          fontSize: '1rem',
        }}
        {...props}
      />
    </div>
  );
};

export default Input;
