import { useMemo, useState } from "react";

const RANGE_OPTIONS = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
];

const formatDate = (date, days) => date.toLocaleDateString(undefined, days === 7
  ? { weekday: "short" }
  : { month: "short", day: "numeric" });

function FeedbackTrends({ feedbacks }) {
  const [rangeDays, setRangeDays] = useState(7);
  const trend = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(start.getDate() - rangeDays + 1);
    const previousStart = new Date(start);
    previousStart.setDate(previousStart.getDate() - rangeDays);

    const days = Array.from({ length: rangeDays }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return { date, count: 0 };
    });
    let previousCount = 0;
    let ratingTotal = 0;

    feedbacks.forEach((feedback) => {
      if (!feedback.createdAt) return;
      const date = new Date(feedback.createdAt);
      if (Number.isNaN(date.getTime())) return;
      date.setHours(0, 0, 0, 0);

      if (date >= start && date <= today) {
        const dayIndex = Math.round((date - start) / 86_400_000);
        if (days[dayIndex]) {
          days[dayIndex].count += 1;
          ratingTotal += Number(feedback.rating) || 0;
        }
      } else if (date >= previousStart && date < start) {
        previousCount += 1;
      }
    });

    const responseCount = days.reduce((total, day) => total + day.count, 0);
    const average = responseCount ? (ratingTotal / responseCount).toFixed(1) : "—";
    const change = previousCount
      ? Math.round(((responseCount - previousCount) / previousCount) * 100)
      : null;

    return { days, responseCount, average, previousCount, change };
  }, [feedbacks, rangeDays]);

  const chartTop = 12;
  const chartBottom = 142;
  const chartWidth = 672;
  const chartLeft = 24;
  const maxCount = Math.max(1, ...trend.days.map((day) => day.count));
  const points = trend.days.map((day, index) => ({
    ...day,
    x: chartLeft + (index / Math.max(1, rangeDays - 1)) * chartWidth,
    y: chartBottom - (day.count / maxCount) * (chartBottom - chartTop),
  }));
  const linePath = points.map((point, index) =>
    `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = `${linePath} L ${points.at(-1).x} ${chartBottom} L ${points[0].x} ${chartBottom} Z`;
  const rangeLabel = `${rangeDays} days`;
  const changeLabel = trend.change === null
    ? trend.responseCount ? "New activity" : "No activity yet"
    : `${trend.change > 0 ? "↑" : trend.change < 0 ? "↓" : "↔"} ${Math.abs(trend.change)}%`;
  const comparisonLabel = trend.previousCount
    ? `vs. previous ${rangeLabel}`
    : trend.responseCount ? `vs. previous ${rangeLabel}` : "No activity in this period";

  return (
    <section className="trend-panel" aria-labelledby="trend-heading">
      <div className="trend-header">
        <div>
          <p className="trend-kicker">RESPONSE MOMENTUM</p>
          <h2 id="trend-heading">Listening, over time.</h2>
          <p className="trend-description">Track how customer conversations are moving.</p>
        </div>
        <div className="trend-range" role="group" aria-label="Trend date range">
          {RANGE_OPTIONS.map((option) => (
            <button
              type="button"
              key={option.days}
              aria-pressed={rangeDays === option.days}
              className={rangeDays === option.days ? "active" : ""}
              onClick={() => setRangeDays(option.days)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="trend-summary">
        <div className="trend-stat">
          <span>Responses</span>
          <strong>{trend.responseCount}</strong>
          <small>in the last {rangeLabel}</small>
        </div>
        <div className="trend-stat">
          <span>Average rating</span>
          <strong>{trend.average}<small>{trend.average === "—" ? "" : " / 5"}</small></strong>
          <small>for this period</small>
        </div>
        <div className="trend-stat trend-change">
          <span>Conversation pace</span>
          <strong className={trend.change > 0 ? "positive" : trend.change < 0 ? "negative" : ""}>
            {changeLabel}
          </strong>
          <small>{comparisonLabel}</small>
        </div>
      </div>

      <div className="trend-chart">
        <svg
          viewBox="0 0 720 190"
          role="img"
          aria-label={`Daily feedback responses for the last ${rangeLabel}`}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="trend-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#85a58a" stopOpacity=".24" />
              <stop offset="100%" stopColor="#85a58a" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[chartTop, (chartTop + chartBottom) / 2, chartBottom].map((y) => (
            <line key={y} x1={chartLeft} x2={chartLeft + chartWidth} y1={y} y2={y} className="chart-gridline" />
          ))}
          <path d={areaPath} fill="url(#trend-area)" />
          <path d={linePath} className="chart-line" />
          {points.map((point, index) => {
            const showLabel = rangeDays === 7 || index % 5 === 0 || index === points.length - 1;
            return (
              <g key={point.date.toISOString()}>
                <circle cx={point.x} cy={point.y} r="3.5" className="chart-point">
                  <title>{`${point.date.toLocaleDateString()}: ${point.count} ${point.count === 1 ? "response" : "responses"}`}</title>
                </circle>
                {showLabel && (
                  <text x={point.x} y="174" textAnchor="middle" className="chart-label">
                    {formatDate(point.date, rangeDays)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <p className="trend-footnote">Each point represents feedback received on that day.</p>
    </section>
  );
}

export default FeedbackTrends;
