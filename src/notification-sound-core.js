import LocalStorageManager from './local-storage-manager';
export default class NotificationSound {
    /**
     * AudioContext の作成（ブラウザ互換性対応）
     */
    static createAudioContext() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        return new AudioContext();
    }

    /**
     * MIDIノート番号を周波数に変換
     * @param {number} n - MIDIノート番号 (69 = A4 = 440Hz)
     */
    static noteToFreq(n) {
        return 440 * Math.pow(2, (n - 69) / 12);
    }

    /**
     * オリジナルチャイム (ウェストミンスター寺院の鐘風、伝統的な学校チャイム)
     * テンポと音色を美しく整えた4打点×2構成
     */
    static playOriginal() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const beatDuration = 0.2; // テンポ調整
            const noteToFreq = NotificationSound.noteToFreq;
            // ウェストミンスター・チャイムの音階 (キートランスポーズ：E5, C5, D5, G4...)
            const chimeNotes = [
                { beat: 0, note: 64 }, { beat: 1, note: 60 }, { beat: 2, note: 62 }, { beat: 3, note: 55 }, // キンコンカンコン
                { beat: 5, note: 55 }, { beat: 6, note: 62 }, { beat: 7, note: 64 }, { beat: 8, note: 60 }  // コンカンキンコン
            ];
            const startTime = ctx.currentTime + 0.05;

            chimeNotes.forEach(item => {
                const time = startTime + (item.beat * beatDuration);
                const duration = 1.8;
                // 倍音構成（オルゴール・鐘のような温かみのある響き）
                const partials = [
                    { ratio: 1.0, vol: 0.20 },
                    { ratio: 2.0, vol: 0.08 },
                    { ratio: 3.0, vol: 0.03 },
                    { ratio: 4.0, vol: 0.01 }
                ];
                partials.forEach(partial => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = noteToFreq(item.note) * partial.ratio;
                    
                    gain.gain.setValueAtTime(0, time);
                    gain.gain.linearRampToValueAtTime(partial.vol, time + 0.05);
                    gain.gain.exponentialRampToValueAtTime(0.00001, time + duration);
                    
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(time);
                    osc.stop(time + duration);
                });
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * 深みのあるお寺の鐘・重厚なベル (bell)
     */
    static playBell() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const noteToFreq = NotificationSound.noteToFreq;
            const time = ctx.currentTime + 0.02;
            const duration = 4.0;
            const rootNote = 52; // 低めのE

            // 鐘の複雑な非調和倍音構成
            const partials = [
                { ratio: 0.5, vol: 0.25 }, // ハム（低域のうなり）
                { ratio: 1.0, vol: 0.35 }, // プライム（基本音）
                { ratio: 1.2, vol: 0.15 }, // サード（短三度：鐘特有の悲しげな響き）
                { ratio: 1.5, vol: 0.15 }, // フィフス
                { ratio: 2.0, vol: 0.10 }, // オクターブ
                { ratio: 3.0, vol: 0.05 }
            ];

            const masterGain = ctx.createGain();
            masterGain.gain.setValueAtTime(0, time);
            masterGain.gain.linearRampToValueAtTime(0.8, time + 0.01);
            masterGain.gain.exponentialRampToValueAtTime(0.00001, time + duration);
            masterGain.connect(ctx.destination);

            partials.forEach((partial) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                // わずかにデチューンさせて揺らぎを作る
                const detune = 1 + (Math.random() - 0.5) * 0.003;
                osc.frequency.value = noteToFreq(rootNote) * partial.ratio * detune;

                gain.gain.setValueAtTime(0, time);
                gain.gain.linearRampToValueAtTime(partial.vol, time + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.00001, time + duration * (1 / partial.ratio)); // 高域ほど早く減衰

                osc.connect(gain);
                gain.connect(masterGain);
                osc.start(time);
                osc.stop(time + duration);
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * 高音できらびやかなフロントエンド・クリスタルベル (bell-high)
     */
    static playBellHigh() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const noteToFreq = NotificationSound.noteToFreq;
            const time = ctx.currentTime + 0.02;
            const duration = 2.5;
            const notes = [76, 79, 83]; // E5, G5, B5 (Emの上品な和音アルペジオ)

            notes.forEach((note, i) => {
                const noteTime = time + (i * 0.08);
                const partials = [
                    { ratio: 1.0, vol: 0.25 },
                    { ratio: 2.0, vol: 0.12 },
                    { ratio: 3.0, vol: 0.05 },
                    { ratio: 4.0, vol: 0.02 }
                ];

                const masterGain = ctx.createGain();
                masterGain.gain.setValueAtTime(0, noteTime);
                masterGain.gain.linearRampToValueAtTime(0.4, noteTime + 0.01);
                masterGain.gain.exponentialRampToValueAtTime(0.00001, noteTime + duration);
                masterGain.connect(ctx.destination);

                partials.forEach(partial => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = noteToFreq(note) * partial.ratio;

                    gain.gain.setValueAtTime(0, noteTime);
                    gain.gain.linearRampToValueAtTime(partial.vol, noteTime + 0.01);
                    gain.gain.exponentialRampToValueAtTime(0.00001, noteTime + duration * (0.8 / partial.ratio));

                    osc.connect(gain);
                    gain.connect(masterGain);
                    osc.start(noteTime);
                    osc.stop(noteTime + duration);
                });
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * 控えめで上品な「ポロン」というツイン・サインベル (soft)
     */
    static playSoft() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const noteToFreq = NotificationSound.noteToFreq;
            const now = ctx.currentTime + 0.02;
            const freqs = [76, 81]; // Mi, La の心地よい完全4度上昇

            freqs.forEach((n, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                const time = now + i * 0.08;
                const duration = 0.5;

                osc.frequency.value = noteToFreq(n);
                
                gain.gain.setValueAtTime(0, time);
                gain.gain.linearRampToValueAtTime(0.15, time + 0.015);
                gain.gain.exponentialRampToValueAtTime(0.00001, time + duration);

                // 角をとるローパスフィルター
                const lp = ctx.createBiquadFilter();
                lp.type = 'lowpass';
                lp.frequency.value = 1500;

                osc.connect(lp);
                lp.connect(gain);
                gain.connect(ctx.destination);

                osc.start(time);
                osc.stop(time + duration);
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * 警告レベルのクラクション・アラートノイズ (loud)
     */
    static playLoud() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const t = ctx.currentTime + 0.02;
            const duration = 0.4;

            const master = ctx.createGain();
            master.gain.setValueAtTime(0, t);
            master.gain.linearRampToValueAtTime(0.6, t + 0.01);
            master.gain.exponentialRampToValueAtTime(0.00001, t + duration);
            master.connect(ctx.destination);

            // 激しい矩形波
            const osc = ctx.createOscillator();
            osc.type = 'square';
            osc.frequency.setValueAtTime(220, t);
            osc.frequency.linearRampToValueAtTime(180, t + duration); // わずかにピッチダウンさせて威嚇感を出す

            // メタルノイズ（金属的な衝突音）を混ぜる
            const bufferSize = ctx.sampleRate * duration;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
            }
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;

            const noiseFilter = ctx.createBiquadFilter();
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.value = 1000;
            noiseFilter.Q.value = 2;

            osc.connect(master);
            noise.connect(noiseFilter);
            noiseFilter.connect(master);

            osc.start(t);
            osc.stop(t + duration);
            noise.start(t);
            noise.stop(t + duration);
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * 高音の警告・ホイッスル風電子アラーム (loud-high)
     */
    static playLoudHigh() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const t = ctx.currentTime + 0.02;
            const duration = 0.5;

            const master = ctx.createGain();
            master.gain.setValueAtTime(0, t);
            master.gain.linearRampToValueAtTime(0.5, t + 0.01);
            master.gain.exponentialRampToValueAtTime(0.00001, t + duration);
            master.connect(ctx.destination);

            // 高ピッチの矩形波 + スイープ
            const osc1 = ctx.createOscillator();
            osc1.type = 'sawtooth';
            osc1.frequency.setValueAtTime(880, t);
            osc1.frequency.linearRampToValueAtTime(1200, t + duration); // 駆け上がるピッチ

            const osc2 = ctx.createOscillator();
            osc2.type = 'square';
            osc2.frequency.setValueAtTime(885, t); // デチューンによるうなり

            const lp = ctx.createBiquadFilter();
            lp.type = 'lowpass';
            lp.frequency.value = 2500;

            osc1.connect(lp);
            osc2.connect(lp);
            lp.connect(master);

            osc1.start(t);
            osc1.stop(t + duration);
            osc2.start(t);
            osc2.stop(t + duration);
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * iPhoneでお馴染みの代表的サウンド「トライトーン」 (bright)
     * 音階: ソ(G5:79) -> ミ(E5:76) -> ド(C5:72)
     * 3音の独立したオシレーターによるポリフォニック・美しいハーモニー残響を完全再現。
     */
    static playIphone() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const noteToFreq = NotificationSound.noteToFreq;
            const seq = [79, 76, 72]; // G5, E5, C5 (トライトーン)
            const start = ctx.currentTime + 0.02;

            seq.forEach((n, i) => {
                const t = start + i * 0.15;
                const duration = 1.5; // 余韻を長めにとりポリフォニー化

                const osc = ctx.createOscillator();
                const overtone = ctx.createOscillator(); // 豊かな倍音をわずかに合成
                const gain = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.value = noteToFreq(n);

                overtone.type = 'sine';
                overtone.frequency.value = noteToFreq(n) * 2; // オクターブ上の倍音

                // アタックを少し柔らかくしてリッチにする
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.20, t + 0.015);
                gain.gain.exponentialRampToValueAtTime(0.00001, t + duration);

                // 高音の艶を出すためのバンドパスフィルタ
                const filt = ctx.createBiquadFilter();
                filt.type = 'bandpass';
                filt.frequency.value = noteToFreq(n);
                filt.Q.value = 1.8;

                osc.connect(filt);
                overtone.connect(filt);
                filt.connect(gain);
                gain.connect(ctx.destination);

                osc.start(t);
                overtone.start(t);
                osc.stop(t + duration);
                overtone.stop(t + duration);
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * Android系でよく聴く、丸みのあるピコピコした未来系チャイム (pulse)
     */
    static playAndroid() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const noteToFreq = NotificationSound.noteToFreq;
            const pattern = [72, 76, 79, 84]; // C5 -> E5 -> G5 -> C6 (アルペジオ)
            const start = ctx.currentTime + 0.02;

            pattern.forEach((n, i) => {
                const t = start + i * 0.07;
                const duration = 0.4;

                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                
                // 丸い矩形波（ローパスで高域を大きく削る）
                osc.type = 'triangle';
                osc.frequency.value = noteToFreq(n);

                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.2, t + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.00001, t + duration);

                const lp = ctx.createBiquadFilter();
                lp.type = 'lowpass';
                lp.frequency.value = 1800;

                osc.connect(lp);
                lp.connect(gain);
                gain.connect(ctx.destination);

                osc.start(t);
                osc.stop(t + duration);
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * マクドナルドのポテト揚がった音「ティロリ♪」の完全再現 (potato)
     * 正確な音階: F#5 (78) -> D#5 (75) -> F#5 (78) を2連射。アタックとスタッカートの長さを極限調律。
     */
    static playMcd() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const noteToFreq = NotificationSound.noteToFreq;
            const start = ctx.currentTime + 0.02;
            
            // F#5, D#5, F#5 の「ティロリ」を2回繰り返す
            const sequence = [
                { note: 78, delay: 0.00 },
                { note: 75, delay: 0.10 },
                { note: 78, delay: 0.20 },
                
                { note: 78, delay: 0.45 },
                { note: 75, delay: 0.55 },
                { note: 78, delay: 0.65 }
            ];

            sequence.forEach((step) => {
                const t = start + step.delay;
                const duration = 0.09; // 歯切れの良い完璧なスタッカート

                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                // 実機に近い少しチープで丸いサイン波
                osc.type = 'sine';
                osc.frequency.value = noteToFreq(step.note);

                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.25, t + 0.004);
                gain.gain.setValueAtTime(0.25, t + duration - 0.01);
                gain.gain.exponentialRampToValueAtTime(0.00001, t + duration);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(t);
                osc.stop(t + duration + 0.01);
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * ファミコン版マリオの「コイン」獲得音の完全再現 (coin)
     * 1音目: B6 (95)が約0.07秒。2音目: E7 (100)が約0.38秒。
     * 矩形波アタック感と2A03音源独自の音量ステップ・エンベロープを完璧にシミュレート。
     */
    static playMario() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const noteToFreq = NotificationSound.noteToFreq;
            const start = ctx.currentTime + 0.02;

            const notes = [
                { note: 95, time: 0.00, dur: 0.07 },
                { note: 100, time: 0.07, dur: 0.38 }
            ];

            notes.forEach((item, idx) => {
                const t = start + item.time;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'square'; // ファミコンパルス波
                osc.frequency.value = noteToFreq(item.note);

                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.18, t + 0.002);
                
                if (idx === 0) {
                    // 1音目は次の音と隙間なく瞬時に切れる
                    gain.gain.setValueAtTime(0.18, t + item.dur - 0.002);
                    gain.gain.linearRampToValueAtTime(0, t + item.dur);
                } else {
                    // 2音目はドラムのような美しい減衰
                    gain.gain.exponentialRampToValueAtTime(0.00001, t + item.dur);
                }

                // 「チリーン」とした金属感を引き出すための中高域用フィルタ
                const hp = ctx.createBiquadFilter();
                hp.type = 'highpass';
                hp.frequency.value = 1200;

                const bp = ctx.createBiquadFilter();
                bp.type = 'bandpass';
                bp.frequency.value = noteToFreq(item.note);
                bp.Q.value = 1.2;

                osc.connect(hp);
                hp.connect(bp);
                bp.connect(gain);
                gain.connect(ctx.destination);

                osc.start(t);
                osc.stop(t + item.dur + 0.05);
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * ドラクエ風「レベルアップ」音 (levelup1 / dq_levelup)
     * 変ホ長調 (Eb Major) の完璧な高速16分アルペジオ上昇と、3度上でハモる実機通りのデュオ矩形波編成。
     */
    static playDq() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const noteToFreq = NotificationSound.noteToFreq;
            const start = ctx.currentTime + 0.02;
            
            // 主旋律と3度ハモリのMIDIノート
            const melody = [75, 77, 79, 80, 82, 84, 86, 87, 89, 86, 87];
            const harmony = [79, 80, 82, 84, 86, 87, 89, 91, 92, 89, 91];
            const stepTime = 0.048; // 超高速な駆け上がり

            melody.forEach((note, i) => {
                const t = start + (i * stepTime);
                const isLast = i === melody.length - 1;
                const duration = isLast ? 0.7 : stepTime - 0.003;

                // 1. 主旋律 (矩形波)
                const osc1 = ctx.createOscillator();
                const gain1 = ctx.createGain();
                osc1.type = 'square';
                osc1.frequency.value = noteToFreq(note);

                gain1.gain.setValueAtTime(0, t);
                gain1.gain.linearRampToValueAtTime(0.12, t + 0.002);
                if (isLast) {
                    gain1.gain.exponentialRampToValueAtTime(0.00001, t + duration);
                } else {
                    gain1.gain.setValueAtTime(0.12, t + duration - 0.002);
                    gain1.gain.linearRampToValueAtTime(0, t + duration);
                }

                osc1.connect(gain1);
                gain1.connect(ctx.destination);
                osc1.start(t);
                osc1.stop(t + duration + 0.02);

                // 2. ハモリ (3度上の矩形波)
                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.type = 'square';
                osc2.frequency.value = noteToFreq(harmony[i]);

                gain2.gain.setValueAtTime(0, t);
                gain2.gain.linearRampToValueAtTime(0.08, t + 0.002);
                if (isLast) {
                    gain2.gain.exponentialRampToValueAtTime(0.00001, t + duration);
                } else {
                    gain2.gain.setValueAtTime(0.08, t + duration - 0.002);
                    gain2.gain.linearRampToValueAtTime(0, t + duration);
                }

                osc2.connect(gain2);
                gain2.connect(ctx.destination);
                osc2.start(t);
                osc2.stop(t + duration + 0.02);
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * ポケモン回復（ポケモンセンター）風チャイム (levelup2)
     */
    static playPokemon() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const noteToFreq = NotificationSound.noteToFreq;
            const start = ctx.currentTime + 0.02;
            const seq = [64, 66, 68, 69, 71, 73, 74, 76]; // ホ長調（Eメジャー）上昇
            const speed = 0.07;

            seq.forEach((n, i) => {
                const t = start + i * speed;
                const duration = 0.4;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.value = noteToFreq(n);

                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.2, t + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.00001, t + duration);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + duration);
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * リアルな水滴音「ドタプン・ピチャン」 (slap / dotapun)
     */
    static playDotapun() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const start = ctx.currentTime + 0.02;
            const duration = 0.25;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            
            // ピッチの急激な下降（ドタッ、プン）
            osc.frequency.setValueAtTime(1200, start);
            osc.frequency.exponentialRampToValueAtTime(150, start + 0.08); // 急降下して水に落ちる音
            osc.frequency.exponentialRampToValueAtTime(800, start + duration); // 最後に気泡が浮く音

            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.4, start + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.00001, start + duration);

            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 1800;

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            osc.start(start);
            osc.stop(start + duration);
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * やさしい木琴・マリンバ風 (marimba)
     */
    static playMarimba() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const noteToFreq = NotificationSound.noteToFreq;
            const seq = [67, 72, 74, 79]; // ソ, ド, レ, ソ
            const start = ctx.currentTime + 0.02;

            seq.forEach((n, i) => {
                const t = start + i * 0.1;
                const duration = 0.5;

                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'triangle';
                osc.frequency.value = noteToFreq(n);

                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.25, t + 0.005);
                gain.gain.exponentialRampToValueAtTime(0.00001, t + duration);

                const filter = ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.value = noteToFreq(n) * 1.05;
                filter.Q.value = 5;

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);

                osc.start(t);
                osc.stop(t + duration);
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * 透明感ある定番メール着信通知チャイム (mail_received)
     * Outlook風の「テロリン♪」(F5→C6) をさわやかなサイン倍音合成で完全再現。
     */
    static playMail() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const noteToFreq = NotificationSound.noteToFreq;
            const start = ctx.currentTime + 0.02;
            const seq = [77, 84]; // F5 -> C6 の完全5度上昇
            const delay = 0.12;

            seq.forEach((n, i) => {
                const t = start + i * delay;
                const duration = 1.5;

                const osc = ctx.createOscillator();
                const overtone = ctx.createOscillator();
                const gain = ctx.createGain();
                
                osc.type = 'sine';
                osc.frequency.value = noteToFreq(n);

                overtone.type = 'sine';
                overtone.frequency.value = noteToFreq(n) * 2; // オクターブ上の明るいきらめき

                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.20, t + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.00001, t + duration);

                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.value = 3000;

                osc.connect(filter);
                overtone.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);

                osc.start(t);
                overtone.start(t);
                osc.stop(t + duration);
                overtone.stop(t + duration);
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * 「ぽきぽき（LINE風）」通知サウンド (line_pokipoki)
     * 完全に「コポッ♪」と弾ける、あの特徴的な超短時間ピッチ降下と2連打の完全再現。
     */
    static playLinePokipoki() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const start = ctx.currentTime + 0.02;

            const clicks = [
                { time: 0.00, startFreq: 1400, endFreq: 400, dur: 0.035, vol: 0.25 },
                { time: 0.07, startFreq: 1600, endFreq: 450, dur: 0.045, vol: 0.35 }
            ];

            clicks.forEach((click) => {
                const t = start + click.time;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(click.startFreq, t);
                osc.frequency.exponentialRampToValueAtTime(click.endFreq, t + click.dur);

                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(click.vol, t + 0.002);
                gain.gain.exponentialRampToValueAtTime(0.00001, t + click.dur);

                const lp = ctx.createBiquadFilter();
                lp.type = 'lowpass';
                lp.frequency.value = 2200;

                osc.connect(lp);
                lp.connect(gain);
                gain.connect(ctx.destination);

                osc.start(t);
                osc.stop(t + click.dur + 0.01);
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * Slackの優しくノックするような通知サウンド (slack_knock)
     * ドアを叩く「トントン」というこもったウッドノックを再現。
     */
    static playSlackKnock() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const start = ctx.currentTime + 0.02;
            const steps = [0.0, 0.14]; // トン、トンの時間間隔

            steps.forEach((delay) => {
                const t = start + delay;
                const duration = 0.06;

                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(450, t);
                osc.frequency.exponentialRampToValueAtTime(150, t + duration);

                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.4, t + 0.002);
                gain.gain.exponentialRampToValueAtTime(0.00001, t + duration);

                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.value = 800; // 深い木の残響のみ

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);

                osc.start(t);
                osc.stop(t + duration + 0.02);
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * Discordの丸みのあるチャイムサウンド (discord_ping)
     * G5(79)とD5(74)を同時に優しくフワッと立ち上げてポコッと落とす。
     */
    static playDiscordPing() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const noteToFreq = NotificationSound.noteToFreq;
            const t = ctx.currentTime + 0.02;
            const duration = 0.35;
            const notes = [74, 79];

            notes.forEach((n) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.value = noteToFreq(n);

                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.25, t + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.00001, t + duration);

                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.value = 1500;

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);

                osc.start(t);
                osc.stop(t + duration + 0.02);
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * おすすめ音色1: 「キラリーン！」星が輝くようなファンタジー・スター (recommend1)
     */
    static playRecommend1() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const noteToFreq = NotificationSound.noteToFreq;
            const start = ctx.currentTime + 0.02;
            const seq = [79, 83, 86, 91]; // G5, B5, D6, G6

            seq.forEach((n, i) => {
                const t = start + i * 0.06;
                const duration = 0.8;

                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.value = noteToFreq(n);

                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.2, t + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.00001, t + duration);

                const filter = ctx.createBiquadFilter();
                filter.type = 'highpass';
                filter.frequency.value = 1000;

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);

                osc.start(t);
                osc.stop(t + duration);
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * おすすめ音色2: 「フワッ」とした温かみのあるアンビエント・パッド風サイン (recommend2)
     */
    static playRecommend2() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const noteToFreq = NotificationSound.noteToFreq;
            const start = ctx.currentTime + 0.02;
            const chord = [64, 67, 71, 74]; // Em9
            const duration = 1.5;

            const masterGain = ctx.createGain();
            masterGain.gain.setValueAtTime(0, start);
            masterGain.gain.linearRampToValueAtTime(0.35, start + 0.2);
            masterGain.gain.exponentialRampToValueAtTime(0.00001, start + duration);
            masterGain.connect(ctx.destination);

            chord.forEach((n) => {
                const osc = ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.value = noteToFreq(n);

                osc.connect(masterGain);
                osc.start(start);
                osc.stop(start + duration);
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * おすすめ音色3: 「タララ・ラーン！」達成感のある大成功ファンファーレ (success)
     */
    static playSuccess() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const noteToFreq = NotificationSound.noteToFreq;
            const start = ctx.currentTime + 0.02;
            const seq = [60, 64, 67, 72]; // C4, E4, G4, C5 (ハ長調の分散和音)
            const tempo = 0.08;

            seq.forEach((n, i) => {
                const t = start + (i * tempo);
                const isLast = i === seq.length - 1;
                const duration = isLast ? 1.2 : 0.15;

                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                
                // 華やかなブラス・シンセ風のノコギリ波
                osc.type = 'sawtooth'; 
                osc.frequency.value = noteToFreq(n);

                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.15, t + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.00001, t + duration);

                // ローパスフィルターで最初は明るく、徐々に丸い音に
                const lp = ctx.createBiquadFilter();
                lp.type = 'lowpass';
                lp.frequency.setValueAtTime(3000, t);
                lp.frequency.exponentialRampToValueAtTime(300, t + duration);

                osc.connect(lp);
                lp.connect(gain);
                gain.connect(ctx.destination);

                osc.start(t);
                osc.stop(t + duration);
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * おすすめ音色4: 「シャラララーン」魔法をかけたようなキラキラウィンドチャイム (magic)
     */
    static playMagic() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const noteToFreq = NotificationSound.noteToFreq;
            const start = ctx.currentTime + 0.02;
            // C5から始まるペンタトニックスケールの高速駆け上がり
            const notes = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93]; 
            const speed = 0.035;

            notes.forEach((n, i) => {
                const t = start + i * speed;
                const duration = 0.8;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sine'; // 澄んだ音色
                osc.frequency.value = noteToFreq(n);

                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.1, t + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.00001, t + duration);

                // パンニングで左右に散らすとより魔法っぽくなる(ステレオ対応環境向け)
                if (ctx.createStereoPanner) {
                    const panner = ctx.createStereoPanner();
                    panner.pan.value = (i % 2 === 0) ? 0.5 : -0.5; // 左右に振る
                    osc.connect(panner);
                    panner.connect(gain);
                } else {
                    osc.connect(gain);
                }
                
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + duration);
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * おすすめ音色5: 「シュワァーン」SF風のワープ・空間移動音 (warp)
     */
    static playWarp() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const start = ctx.currentTime + 0.02;
            const duration = 0.9;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            
            // ピッチが急上昇して、なだらかに降下していく
            osc.frequency.setValueAtTime(150, start);
            osc.frequency.exponentialRampToValueAtTime(1800, start + 0.2);
            osc.frequency.exponentialRampToValueAtTime(50, start + duration);

            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.3, start + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.00001, start + duration);

            // 少し歪み(Drive)のような効果を出すため波形をシェイピング
            const distortion = ctx.createWaveShaper();
            function makeDistortionCurve(amount) {
                let k = typeof amount === 'number' ? amount : 50,
                    n_samples = 44100,
                    curve = new Float32Array(n_samples),
                    deg = Math.PI / 180,
                    i = 0,
                    x;
                for ( ; i < n_samples; ++i ) {
                    x = i * 2 / n_samples - 1;
                    curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) );
                }
                return curve;
            }
            distortion.curve = makeDistortionCurve(20);
            distortion.oversample = '4x';

            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(500, start);
            filter.frequency.exponentialRampToValueAtTime(4000, start + 0.2);
            filter.frequency.exponentialRampToValueAtTime(100, start + duration);

            osc.connect(distortion);
            distortion.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            osc.start(start);
            osc.stop(start + duration);
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * 「チン！」という澄んだ電子レンジやベルの金属音 (ding)
     */
    static playDing() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const t = ctx.currentTime + 0.02;
            const duration = 2.0;
            const rootFreq = 1800; // 高音のチン

            const master = ctx.createGain();
            master.gain.setValueAtTime(0, t);
            master.gain.linearRampToValueAtTime(0.4, t + 0.002);
            master.gain.exponentialRampToValueAtTime(0.00001, t + duration);
            master.connect(ctx.destination);

            // 金属の響きを作る非調和倍音
            const partials = [1.0, 1.91, 2.44, 3.12];
            partials.forEach((ratio, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(rootFreq * ratio, t);
                
                const vol = 0.15 / (i + 1);
                gain.gain.setValueAtTime(vol, t);
                gain.gain.exponentialRampToValueAtTime(0.00001, t + duration / (i * 0.5 + 1));

                osc.connect(gain);
                gain.connect(master);
                osc.start(t);
                osc.stop(t + duration);
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * ジョジョの「To Be Continued」(jojo)
     */
    static playJojo() {
        try {
            const ctx = NotificationSound.createAudioContext();
            const noteToFreq = NotificationSound.noteToFreq;
            const start = ctx.currentTime + 0.02;

            const seq = [
                { note: 79, delay: 0.00, duration: 1.00 },
                { note: 83, delay: 0.08, duration: 1.20 },
                { note: 88, delay: 0.16, duration: 1.50 }
            ];

            seq.forEach((item) => {
                const t = start + item.delay;
                const duration = item.duration;

                const partials = [
                    { ratio: 1.0, vol: 0.50 },
                    { ratio: 2.0, vol: 0.26 },
                    { ratio: 3.0, vol: 0.10 }
                ];

                partials.forEach(partial => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();

                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(noteToFreq(item.note) * partial.ratio, t);

                    // エンベロープ設定 (アタック・デケイ)
                    gain.gain.setValueAtTime(0, t);
                    gain.gain.linearRampToValueAtTime(partial.vol, t + 0.016);
                    gain.gain.exponentialRampToValueAtTime(0.00001, t + duration);
                    
                const filter = ctx.createBiquadFilter();
                filter.type = 'highpass';
                filter.frequency.setValueAtTime(noteToFreq(item.note) * 1, t);
                filter.Q.setValueAtTime(3.1, t);
                
                    
                osc.connect(filter);
                filter.connect(gain);
                    gain.connect(ctx.destination);

                    osc.start(t);
                    osc.stop(t + duration + 0.05);
                });
            });
        } catch (e) {
            console.warn('音声再生がブロックされました。', e);
        }
    }

    /**
     * 統合再生インターフェース
     * @param {string} profile - 再生したいサウンドキー
     */
    static play(profile = LocalStorageManager.notificationSound || 'bell') {
        const map = {
            // 基本システムキー
            'original': NotificationSound.playOriginal,
            'bell': NotificationSound.playBell,
            'bell-high': NotificationSound.playBellHigh,
            'soft': NotificationSound.playSoft,
            'loud': NotificationSound.playLoud,
            'loud-high': NotificationSound.playLoudHigh,
            'marimba': NotificationSound.playMarimba,
            'recommend1': NotificationSound.playRecommend1,
            'recommend2': NotificationSound.playRecommend2,
            'success': NotificationSound.playSuccess,
            'magic': NotificationSound.playMagic,
            'warp': NotificationSound.playWarp,

            // システムUI側マッピング
            'bright': NotificationSound.playIphone,       // iPhoneトライトーン
            'pulse': NotificationSound.playAndroid,       // Android
            'potato': NotificationSound.playMcd,          // マクドナルドポテト
            'coin': NotificationSound.playMario,          // マリオコイン
            'levelup1': NotificationSound.playDq,         // ドラクエレベルアップ
            'levelup2': NotificationSound.playPokemon,    // ポケモン回復
            'slap': NotificationSound.playDotapun,        // 水滴ドタプン
            'dotapun': NotificationSound.playDotapun,     // 水滴ドタプン

            // アプリ系＆追加サウンドキー
            'ding': NotificationSound.playDing,                   // チン！
            'mail_received': NotificationSound.playMail,           // メールの着信音
            'line_pokipoki': NotificationSound.playLinePokipoki,   // ぽきぽき（LINE）
            'slack_knock': NotificationSound.playSlackKnock,       // Slack
            'discord_ping': NotificationSound.playDiscordPing,     // Discord
            'jojo': NotificationSound.playJojo,                   // ジョジョ

            // エイリアス
            'iphone': NotificationSound.playIphone,
            'android': NotificationSound.playAndroid,
            'mcd_potato': NotificationSound.playMcd,
            'mario_coin': NotificationSound.playMario,
            'dq_levelup': NotificationSound.playDq,
            'pokemon_heal': NotificationSound.playPokemon,
            'droplet_dotapun': NotificationSound.playDotapun
        };

        const fn = map[profile] || NotificationSound.playBell;
        return fn();
    }
}
