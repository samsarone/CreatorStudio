import React from 'react';
import Select from 'react-select';
import { useColorMode } from '../../contexts/ColorMode';

export default function SingleSelect(props) {
  const {
    options,
    value,
    onChange,
    classNamePrefix,
    isSearchable = true,
  } = props;

  const { colorMode } = useColorMode();


  // Styles for select and dropdowns
  const formSelectBgColor = colorMode === 'dark' ? '#030712' : '#f3f4f6';
  const formSelectTextColor = colorMode === 'dark' ? '#f3f4f6' : '#111827';
  const formSelectSelectedTextColor =
    colorMode === 'dark' ? '#f3f4f6' : '#111827';
  const formSelectHoverColor = colorMode === 'dark' ? '#1f2937' : '#2563EB';


  return (
    <Select
      isSearchable={isSearchable}
      menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
      menuPosition="fixed"
      styles={{
        menuPortal: (provided) => ({
          ...provided,
          zIndex: 9999,
        }),
        menu: (provided) => ({
          ...provided,
          backgroundColor: formSelectBgColor,
          zIndex: 9999,
        }),
        singleValue: (provided) => ({
          ...provided,
          color: formSelectTextColor,
        }),
        control: (provided, state) => ({
          ...provided,
          backgroundColor: formSelectBgColor,
          borderColor: state.isFocused ? '#007BFF' : '#737373',
          '&:hover': {
            borderColor: state.isFocused ? '#007BFF' : '#737373',
          },
          boxShadow: state.isFocused
            ? '0 0 0 0.2rem rgba(0, 123, 255, 0.25)'
            : null,
          minHeight: '38px',
          height: '38px',
        }),
        option: (provided, state) => ({
          ...provided,
          backgroundColor: formSelectBgColor,
          color: state.isSelected
            ? formSelectSelectedTextColor
            : formSelectTextColor,
          '&:hover': {
            backgroundColor: formSelectHoverColor,
          },
        }),
        input: (provided) => ({
          ...provided,
          color: formSelectTextColor,     // This ensures typed text has the same color
        }),
        placeholder: (provided) => ({
          ...provided,
          color: formSelectTextColor,     // This ensures placeholder text has the same color
        }),
      }}
      options={options}
      value={value}
      onChange={onChange}
      classNamePrefix={classNamePrefix}
    />
  );
}
