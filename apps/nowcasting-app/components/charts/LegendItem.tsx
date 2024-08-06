import { FC } from "react";
import useGlobalState from "../helpers/globalState";
import { LegendLineGraphIcon } from "../icons/icons";
import Toggle from "../Toggle";

const LegendItem: FC<{
  iconClasses: string;
  label: string;
  dashStyle?: "both" | "dashed" | "solid";
  dataKey: string;
}> = ({ iconClasses, label, dashStyle, dataKey }) => {
  const [visibleLines, setVisibleLines] = useGlobalState("visibleLines");
  const isVisible = visibleLines.includes(dataKey);

  const toggleLineVisibility = () => {
    if (isVisible) {
      setVisibleLines(visibleLines.filter((line) => line !== dataKey));
    } else {
      setVisibleLines([...visibleLines, dataKey]);
    }
  };

  return (
    <div className="flex items-center flex-initial">
      <LegendLineGraphIcon className={iconClasses} dashStyle={dashStyle} />
      <button
        className="inline-flex flex-1 text-left pl-1 max-w-full w-auto dash:w-auto text-xs dash:text-base dash:tracking-wider dash:pb-1"
        onClick={toggleLineVisibility}
      >
        <span
          className={`block sometimes-bold w-auto uppercase pl-1${
            isVisible ? " font-extrabold dash:font-semibold" : " text-ocf-gray-700"
          }`}
          title={label}
        >
          {label}
        </span>
      </button>
      <Toggle onClick={toggleLineVisibility} visible={isVisible} />
    </div>
  );
};

export default LegendItem;
