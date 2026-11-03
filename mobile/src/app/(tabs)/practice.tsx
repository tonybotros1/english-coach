import { ComingSoon } from '@/components/coming-soon';

export default function PracticeScreen() {
  return (
    <ComingSoon
      eyebrow="Practice"
      title="Practise any time"
      icon="chatbubbles-outline"
      phase="Coming soon"
      intro="Extra practice outside your daily plan. Every session counts toward your weekly minutes."
      features={[
        { icon: 'layers-outline', title: 'Review cards', detail: 'Your own mistakes, repeated just before you forget' },
        { icon: 'text-outline', title: 'Grammar and vocabulary', detail: 'Short lessons with a quick quiz' },
        { icon: 'headset-outline', title: 'Listening', detail: 'Dictation at your level' },
        { icon: 'create-outline', title: 'Writing', detail: 'Corrections and a better version of your text' },
        { icon: 'mic-outline', title: 'Speaking', detail: 'Pronunciation scores, word by word' },
      ]}
    />
  );
}
