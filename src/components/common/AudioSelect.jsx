import React from 'react';
import Select, { components } from 'react-select';
import { useColorMode } from '../../contexts/ColorMode';

export default function AudioSelect(props) {
  const { options, value, onChange } = props;
  const { colorMode } = useColorMode();

  // Styles for select and dropdowns
  let formSelectBgColor = colorMode === 'dark' ? '#030712' : '#f3f4f6';
  let formSelectTextColor = colorMode === 'dark' ? '#f3f4f6' : '#111827';
  let formSelectSelectedTextColor = colorMode === 'dark' ? '#f3f4f6' : '#111827';
  let formSelectHoverColor = colorMode === 'dark' ? '#1f2937' : '#2563EB';

  // Custom Option Component
  const Option = (props) => {
    const { data } = props;
    return (
      <components.Option {...props}>
        <div className="flex items-center justify-between">
          <span>{data.label}</span>
          {data.icon && (
            <span onClick={(evt) => data.onClick(evt)}>
              {data.icon}
            </span>
          )}
        </div>
      </components.Option>
    );
  };

  // Custom SingleValue Component
  const SingleValue = (props) => {
    return (
      <components.SingleValue {...props}>
        {props.data.label}
        {/* SVG icon is intentionally omitted here to hide it in the selected option */}
      </components.SingleValue>
    );
  };

  return (

    
    <Select
      options={options}
      value={value}
      onChange={onChange}
      components={{ Option, SingleValue }}
      styles={{
        menu: (provided) => ({
          ...provided,
          backgroundColor: formSelectBgColor,
        }),
        singleValue: (provided) => ({
          ...provided,
          color: formSelectTextColor,
        }),
        control: (provided, state) => ({
          ...provided,
          backgroundColor: formSelectBgColor,
          borderColor: state.isFocused ? '#007BFF' : '#ced4da',
          '&:hover': {
            borderColor: state.isFocused ? '#007BFF' : '#ced4da',
          },
          boxShadow: state.isFocused ? '0 0 0 0.2rem rgba(0, 123, 255, 0.25)' : null,
          minHeight: '38px',
          height: '38px',
        }),
        option: (provided, state) => ({
          ...provided,
          backgroundColor: formSelectBgColor,
          color: state.isSelected ? formSelectSelectedTextColor : formSelectTextColor,
          '&:hover': {
            backgroundColor: formSelectHoverColor,
          },
        }),
      }}
    />
  );
}
