import { useMemo } from "react";
import { get30MinNow, useGlobalState } from "../helpers/globalState";
import { ForecastData, PvRealData } from "../types";
import { formatISODateString, getDeltaBucket } from "../helpers/utils";
import { ChartData } from "./remix-line";
import { DELTA_BUCKET } from "../../constant";

//separate paste forecast from future forecast (ie: after selectedTime)
const getForecastChartData = (
  timeNow: string,
  fr?: {
    targetTime: string;
    expectedPowerGenerationMegawatts: number;
  },
  forecast_horizon?: number
) => {
  if (!fr) return {};

  const futureKey = forecast_horizon ? "NHR_FORECAST" : "FORECAST";
  const pastKey = forecast_horizon ? "NHR_PAST_FORECAST" : "PAST_FORECAST";

  if (new Date(fr.targetTime).getTime() > new Date(timeNow + ":00.000Z").getTime())
    return {
      [futureKey]: fr.expectedPowerGenerationMegawatts
    };
  else if (new Date(fr.targetTime).getTime() === new Date(timeNow + ":00.000Z").getTime())
    return {
      [futureKey]: fr.expectedPowerGenerationMegawatts
    };
  else
    return {
      [pastKey]: fr.expectedPowerGenerationMegawatts
    };
};
const getDelta: (datum: ChartData) => number = (datum) => {
  if (datum.PAST_FORECAST !== undefined) {
    if (datum.GENERATION_UPDATED !== undefined) {
      return Number(datum.GENERATION_UPDATED) - Number(datum.PAST_FORECAST);
    } else if (datum.GENERATION !== undefined) {
      return Number(datum.GENERATION) - Number(datum.PAST_FORECAST);
    }
  } else if (datum.FORECAST !== undefined && datum["NHR_FORECAST"] !== undefined) {
    return Number(datum.FORECAST) - Number(datum["NHR_FORECAST"]);
  }
  return 0;
};

const useFormatChartData = ({
  forecastData,
  fourHourData,
  probabilisticRangeData,
  pvRealDayAfterData,
  pvRealDayInData,
  timeTrigger,
  delta = false
}: {
  forecastData?: ForecastData;
  fourHourData?: ForecastData;
  probabilisticRangeData?: ForecastData;
  pvRealDayAfterData?: PvRealData;
  pvRealDayInData?: PvRealData;
  timeTrigger?: string;
  delta?: boolean;
}) => {
  const [nHourForecast] = useGlobalState("nHourForecast");

  const data = useMemo(() => {
    if (forecastData && pvRealDayAfterData && pvRealDayInData && timeTrigger) {
      const timeNow = formatISODateString(get30MinNow());
      const chartMap: Record<string, ChartData> = {};

      const addDataToMap = (
        dataPoint: any,
        getDatetimeUtc: (dp: any) => string,
        getPvdata: (dp: any) => Partial<ChartData>
      ) => {
        const pvData = getPvdata(dataPoint);
        const formattedDate = getDatetimeUtc(dataPoint);
        if (chartMap[formattedDate]) {
          chartMap[formattedDate] = {
            ...chartMap[formattedDate],
            ...pvData
          };
        } else {
          chartMap[formattedDate] = {
            formattedDate: formatISODateString(formattedDate),
            ...pvData
          };
        }
      };

      pvRealDayAfterData.forEach((pva) =>
        addDataToMap(
          pva,
          (db) => db.datetimeUtc,
          (db) => ({
            GENERATION_UPDATED: db.solarGenerationKw / 1000
          })
        )
      );
      pvRealDayInData.forEach((pvIn) =>
        addDataToMap(
          pvIn,
          (db) => db.datetimeUtc,
          (db) => ({
            GENERATION: db.solarGenerationKw / 1000
          })
        )
      );
      forecastData.forEach((fc) => {
        addDataToMap(
          fc,
          (db) => db.targetTime,
          (db) => getForecastChartData(timeNow, db)
        );
        if (fc.plevels) {
          addDataToMap(
            fc,
            (db) => db.targetTime,
            //add an array here for the probabilistic area in the chart
            (db) => ({
              PROBABILISTIC_RANGE: [db.plevels.plevel_10, db.plevels.plevel_90]
            })
          );
        }
        if (fc.plevels?.plevel_10) {
          addDataToMap(
            fc,
            (db) => db.targetTime,
            // probabilistic lower bound for the tooltip to use
            (db) => ({
              PROBABILISTIC_LOWER_BOUND: db.plevels.plevel_10
            })
          );
        }
        if (fc.plevels?.plevel_90) {
          addDataToMap(
            fc,
            (db) => db.targetTime,
            (db) => ({
              // probabilistic upper bound for the tooltip to use
              PROBABILISTIC_UPPER_BOUND: db.plevels.plevel_90
            })
          );
        }
      });

      if (fourHourData) {
        fourHourData.forEach((fc) =>
          addDataToMap(
            fc,
            (db) => db.targetTime,
            (db) => getForecastChartData(timeNow, db, nHourForecast * 60)
          )
        );
      }
      if (delta) {
        for (const chartDatum in chartMap) {
          if (typeof chartMap[chartDatum] === "object") {
            const delta = getDelta(chartMap[chartDatum]);
            chartMap[chartDatum].DELTA = delta;
            chartMap[chartDatum].DELTA_BUCKET = getDeltaBucket(delta);
          }
        }
      }

      return Object.values(chartMap);
    }
    return [];
    // timeTrigger is used to trigger chart calculation when time changes
  }, [forecastData, fourHourData, pvRealDayInData, pvRealDayAfterData, timeTrigger]);
  return data;
};

export default useFormatChartData;
