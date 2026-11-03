import { ComingSoon } from '@/components/coming-soon';

export default function PlanScreen() {
  return (
    <ComingSoon
      eyebrow="Plan"
      title="Your 12-week plan"
      icon="map-outline"
      phase="After your test"
      intro="Once you know your level, the app builds a plan that gives more time to your weakest skills and fits the minutes you have each day."
      features={[
        { icon: 'flag-outline', title: 'Target and timeline', detail: 'Based on about 200 study hours per CEFR level' },
        { icon: 'calendar-outline', title: 'Week by week', detail: 'A clear focus for each week and each day' },
        { icon: 'git-compare-outline', title: 'Balanced practice', detail: 'Input, output, language study and fluency' },
        { icon: 'refresh-outline', title: 'Checkpoints', detail: 'A short retest every 4 weeks updates your plan' },
      ]}
    />
  );
}
