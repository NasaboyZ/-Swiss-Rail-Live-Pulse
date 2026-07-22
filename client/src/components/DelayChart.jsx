import { useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import * as d3 from 'd3';
import { connectionStore } from '../stores';
import styles from './DelayChart.module.css';

/**
 * D3.js bar chart — visualises delay (minutes) at each stop along the
 * selected connection's route.
 *
 * This is the "OnTime"-inspired feature: showing where delays accumulate
 * or recover along a journey mirrors what Trafit's OnTime product does
 * for punctuality forecasting.
 *
 * ── D3 concepts used ─────────────────────────────────────────────
 * d3.scaleBand    Maps stop names to x-positions (ordinal scale)
 * d3.scaleLinear  Maps delay minutes to bar heights (quantitative)
 * d3.axisBottom   Renders the x-axis tick labels
 * d3.axisLeft     Renders the y-axis with minute labels
 * selection.join  Idiomatic enter/update/exit pattern for data binding
 */
const DelayChart = observer(() => {
  const svgRef = useRef(null);
  const data = connectionStore.delayChartData;

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const el = svgRef.current;
    const margin = { top: 12, right: 12, bottom: 52, left: 36 };
    const totalWidth  = el.clientWidth  || 400;
    const totalHeight = el.clientHeight || 160;
    const width  = totalWidth  - margin.left - margin.right;
    const height = totalHeight - margin.top  - margin.bottom;

    const svg = d3.select(el);
    svg.selectAll('*').remove(); // clear on re-render

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // ── Scales ───────────────────────────────────────────────────
    const x = d3.scaleBand()
      .domain(data.map((_, i) => i))
      .range([0, width])
      .padding(0.25);

    const maxDelay = Math.max(d3.max(data, (d) => d.delay) ?? 0, 5);
    const y = d3.scaleLinear()
      .domain([0, maxDelay])
      .nice()
      .range([height, 0]);

    // ── Grid lines ───────────────────────────────────────────────
    g.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(y).tickSize(-width).tickFormat(''))
      .call((axis) => {
        axis.select('.domain').remove();
        axis.selectAll('.tick line')
          .attr('stroke', '#e2e8f0')
          .attr('stroke-dasharray', '3,3');
      });

    // ── Bars ─────────────────────────────────────────────────────
    g.selectAll('rect')
      .data(data)
      .join('rect')
      .attr('x', (_, i) => x(i))
      .attr('y', (d) => y(d.delay))
      .attr('width', x.bandwidth())
      .attr('height', (d) => height - y(d.delay))
      .attr('rx', 3)
      .attr('fill', (d) =>
        d.delay < 3  ? '#059669' :
        d.delay < 10 ? '#d97706' : '#dc2626'
      )
      .attr('opacity', 0.85);

    // ── Delay labels on bars ─────────────────────────────────────
    g.selectAll('.bar-label')
      .data(data.filter((d) => d.delay > 0))
      .join('text')
      .attr('class', 'bar-label')
      .attr('x', (_, i) => {
        // find original index
        const origIdx = data.findIndex((d) => d === data.filter((d2) => d2.delay > 0)[i]);
        return x(origIdx) + x.bandwidth() / 2;
      })
      .attr('y', (d) => y(d.delay) - 4)
      .attr('text-anchor', 'middle')
      .attr('font-size', 9)
      .attr('font-weight', '600')
      .attr('fill', '#475569')
      .text((d) => `+${d.delay}m`);

    // ── X axis ───────────────────────────────────────────────────
    const xAxis = g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(
        d3.axisBottom(x).tickFormat((i) => {
          const name = data[i]?.stationName ?? '';
          return name.length > 9 ? name.slice(0, 9) + '…' : name;
        })
      );

    xAxis.select('.domain').attr('stroke', '#e2e8f0');
    xAxis.selectAll('.tick line').attr('stroke', '#e2e8f0');
    xAxis.selectAll('text')
      .attr('fill', '#475569')
      .attr('font-size', 10)
      .attr('transform', 'rotate(-35)')
      .attr('text-anchor', 'end')
      .attr('dy', '0.35em')
      .attr('dx', '-0.5em');

    // ── Y axis ───────────────────────────────────────────────────
    const yAxis = g.append('g')
      .call(d3.axisLeft(y).ticks(4).tickFormat((d) => `${d}m`));

    yAxis.select('.domain').attr('stroke', '#e2e8f0');
    yAxis.selectAll('.tick line').attr('stroke', '#e2e8f0');
    yAxis.selectAll('text').attr('fill', '#94a3b8').attr('font-size', 10);

  }, [data]);

  if (data.length === 0) return null;

  return (
    <div className={styles.wrapper}>
      <h4 className={styles.title}>
        Verspätungsprofil entlang der Route
        <span className={styles.subtitle}>D3.js — analog zu OnTime</span>
      </h4>
      <svg ref={svgRef} className={styles.svg} />
    </div>
  );
});

export default DelayChart;
