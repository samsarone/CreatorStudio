import { Tooltip } from 'react-tooltip';
import { FaRegQuestionCircle } from "react-icons/fa";


function HeaderTooltip(props) {
  const { content , id } = props;
  return (
    <div>
      <a data-tooltip-id={id} data-tooltip-content={content}>
        <FaRegQuestionCircle />
      </a>
      <Tooltip id={id} />
    </div>
  );
}
