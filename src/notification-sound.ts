import LocalStorageManager from './local-storage-manager';
import NotificationSoundCore from './notification-sound-core.js';
import type {DoneNotificationSound, DoneSelectOption} from './types';

const SOUND_OPTIONS: DoneSelectOption<DoneNotificationSound>[] = [
  {value: 'original', label: '元のチャイム'},
  {value: 'bell', label: 'ベル（標準）'},
  {value: 'bell-high', label: 'ベル（高音）'},
  {value: 'soft', label: '会議向け（控えめ）'},
  {value: 'loud', label: '会議向け（大音量ワンショット）'},
  {value: 'loud-high', label: '会議向け（大音量ワンショット・高音）'},
  {value: 'bright', label: '短いメロディ（明るめ）'},
  {value: 'pulse', label: '連続ビープ（パルス）'},
  {value: 'potato', label: 'ポテト上がり風'},
  {value: 'coin', label: 'コイン'},
  {value: 'levelup1', label: 'レベルアップ1'},
  {value: 'levelup2', label: 'レベルアップ2'},
  {value: 'slap', label: 'ビンタ'},
  {value: 'marimba', label: 'マリンバみたいな音'},
  {value: 'recommend1', label: 'おすすめ音1'},
  {value: 'recommend2', label: 'おすすめ音2'},
  {value: 'dotapun', label: 'ふわっと弾む音'},
  {value: 'success', label: '大成功ファンファーレ'},
  {value: 'magic', label: '魔法のキラキラ音'},
  {value: 'warp', label: 'SFワープ音'},
  {value: 'jojo', label: 'To Be Continued'},
  {value: 'ding', label: 'チン'},
  {value: 'mail_received', label: 'メールの着信音 (さわやかな2音)'},
  {value: 'line_pokipoki', label: 'ぽきぽき'},
  {value: 'slack_knock', label: 'トントン'},
  {value: 'discord_ping', label: 'プンッ'},
];

export default class NotificationSound extends NotificationSoundCore {
  static get options(): DoneSelectOption<DoneNotificationSound>[] {
    return SOUND_OPTIONS;
  }

  static playSelected(): void {
    NotificationSound.play(LocalStorageManager.notificationSound);
  }
}
