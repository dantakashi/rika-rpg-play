(function (root) {
    const QUESTIONS = [
        { q: 'まるはどれ？', choices: ['○', '△', '□', '☆'], answer: 0, desc: 'まるい記号は「○」です。', hint: { text: '角がない記号を探します。' } },
        { q: '大きいのはどっち？', choices: ['小さい箱', '大きい箱', '同じ箱', '見えない箱'], answer: 1, desc: '「大きい箱」が大きいほうです。', hint: { text: '名前に大きさが書いてあります。' } },
        { q: '左の反対はどれ？', choices: ['上', '右', '下', '左'], answer: 1, desc: '左の反対は右です。', hint: { text: '向きをくるりと反対にします。' } },
        { q: '三角形の角はいくつ？', choices: ['1こ', '2こ', '3こ', '4こ'], answer: 2, desc: '三角形には角が3こあります。', hint: { text: '「三」が手がかりです。' } },
        { q: '「あ」の次はどれ？', choices: ['い', 'う', 'え', 'お'], answer: 0, desc: '五十音では「あ」の次は「い」です。', hint: { text: 'あいうえお、と続きます。' } },
        { q: '四角形の辺はいくつ？', choices: ['2本', '3本', '4本', '5本'], answer: 2, desc: '四角形の辺は4本です。', hint: { text: '名前の「四」を見ます。' } },
        { q: '昼の反対はどれ？', choices: ['朝', '夜', '春', '晴れ'], answer: 1, desc: '昼の反対は夜です。', hint: { text: '暗くなる時間を考えます。' } },
        { q: '一番早く進みそうなのは？', choices: ['ゆっくり歩く', '止まる', '走る', '眠る'], answer: 2, desc: '走るのが一番早く進みます。', hint: { text: '動きの速さを比べます。' } },
        { q: '同じ文字はどれ？', choices: ['あ', 'い', 'あ', 'う'], answer: 0, desc: '同じ文字は「あ」です。', hint: { text: '一つ目と三つ目を見比べます。' } },
        { q: '「大」の反対はどれ？', choices: ['長', '小', '高', '新'], answer: 1, desc: '「大」の反対は「小」です。', hint: { text: '大きさを表す言葉です。' } },
        { q: '四つのしるしはいくつ？', choices: ['2こ', '3こ', '4こ', '5こ'], answer: 2, desc: '四つのしるしは4こです。', hint: { text: '「四つ」に注目します。' } },
        { q: '時計の数字はどこから始まる？', choices: ['0', '1', '5', '12'], answer: 1, desc: '時計の数字は1から12までです。', hint: { text: '文字盤の一番上を見ます。' } },
        { q: '「上」の反対はどれ？', choices: ['右', '左', '下', '中'], answer: 2, desc: '「上」の反対は「下」です。', hint: { text: '反対方向へ目を向けます。' } },
        { q: '五十音の最後の文字は？', choices: ['あ', 'ん', 'を', 'の'], answer: 1, desc: '五十音の最後は「ん」です。', hint: { text: '「あ」からずっと唱えます。' } },
        { q: '同じ形はどれ？', choices: ['○と○', '○と△', '△と□', '□と☆'], answer: 0, desc: '○と○は同じ形です。', hint: { text: '二つの記号を見比べます。' } },
        { q: '朝の次に来るのは？', choices: ['夜', '昼', '昨日', '来年'], answer: 1, desc: '一日の順番は朝、昼、夜です。', hint: { text: '空が明るい時間を思い出します。' } },
        { q: '長いのはどっち？', choices: ['短いひも', '長いひも', '丸い石', '小さな点'], answer: 1, desc: '「長いひも」が長いほうです。', hint: { text: '名前に長さが書いてあります。' } },
        { q: 'きらきらマークに近いのはどれ？', choices: ['☆', '□', '○', '△'], answer: 0, desc: 'きらきらマークは「☆」です。', hint: { text: 'とがった飾りの形を探します。' } },
        { q: '二つと二つを合わせると？', choices: ['1つ', '2つ', '3つ', '4つ'], answer: 3, desc: '二つと二つで四つです。', hint: { text: '2に2を足します。' } },
        { q: '新しいの反対はどれ？', choices: ['古い', '明るい', '近い', '太い'], answer: 0, desc: '新しいの反対は古いです。', hint: { text: '時間がたったものを考えます。' } }
    ].map((question) => Object.freeze({
        ...question,
        type: 'choice',
        s: 'dummy',
        choices: Object.freeze([...question.choices]),
        hint: Object.freeze({ ...question.hint })
    }));

    const stats = { asked: 0, correct: 0, wrong: 0 };
    let current = null;
    let answered = false;
    let selectedIndex = 0;
    let resultHandler = () => {};
    let continueHandler = () => {};
    let hintPopup = null;

    function elements() {
        const doc = root.document;
        return {
            overlay: doc?.getElementById('qOverlay'),
            head: doc?.getElementById('qhead'),
            context: doc?.getElementById('qctx'),
            question: doc?.getElementById('qq'),
            image: doc?.getElementById('qimg'),
            answers: doc?.getElementById('qans'),
            feedback: doc?.getElementById('qfeed')
        };
    }

    function clearChildren(element) {
        if (!element) return;
        if (typeof element.replaceChildren === 'function') {
            element.replaceChildren();
            return;
        }
        while (element.firstChild) element.removeChild(element.firstChild);
    }

    function clearHint() {
        if (hintPopup?.parentNode) hintPopup.parentNode.removeChild(hintPopup);
        hintPopup = null;
    }

    function closeOverlay() {
        const { overlay, head, context, question, image, answers, feedback } = elements();
        clearHint();
        if (overlay) {
            overlay.hidden = true;
            overlay.classList?.remove('show');
            overlay.setAttribute?.('aria-hidden', 'true');
        }
        clearChildren(head);
        clearChildren(answers);
        if (context) context.textContent = '';
        if (question) question.textContent = '';
        if (image) image.textContent = '';
        if (feedback) {
            feedback.textContent = '';
            feedback.hidden = true;
        }
        current = null;
        answered = false;
    }

    function hintText(question) {
        if (!question?.hint) return '';
        return typeof question.hint === 'string' ? question.hint : question.hint.text || '';
    }

    function showHint(button) {
        const doc = root.document;
        if (!doc?.body || !current) return;
        clearHint();
        hintPopup = doc.createElement('div');
        hintPopup.className = 'quiz-hint-popup';
        hintPopup.setAttribute('role', 'dialog');
        const title = doc.createElement('strong');
        title.textContent = 'ヒント';
        const text = doc.createElement('p');
        text.textContent = hintText(current) || '問題をゆっくり読み直します。';
        const close = doc.createElement('button');
        close.type = 'button';
        close.textContent = '閉じる';
        close.addEventListener('click', () => {
            clearHint();
            button?.setAttribute?.('aria-expanded', 'false');
        });
        hintPopup.append(title, text, close);
        doc.body.appendChild(hintPopup);
        button?.setAttribute?.('aria-expanded', 'true');
    }

    function updateSelection(buttons) {
        buttons.forEach((button, index) => {
            button.classList?.toggle('selected', index === selectedIndex);
            button.setAttribute?.('aria-selected', String(index === selectedIndex));
        });
    }

    function showFeedback(correct) {
        const { answers, feedback } = elements();
        if (!feedback) return;
        if (answers) {
            Array.from(answers.children || []).forEach((button) => {
                button.disabled = true;
            });
        }
        feedback.hidden = false;
        feedback.textContent = correct
            ? '正解です。強化を受け取りました。'
            : `不正解でも大丈夫です。正解：${current.choices[current.answer]}　理由：${current.desc}`;
        if (!correct) {
            const next = root.document.createElement('button');
            next.type = 'button';
            next.className = 'primary';
            next.textContent = 'つぎへ';
            next.addEventListener('click', () => {
                const callback = continueHandler;
                closeOverlay();
                callback();
            });
            feedback.appendChild(next);
        }
    }

    function answer(index) {
        if (!current || answered || index < 0 || index >= current.choices.length) return false;
        answered = true;
        const correct = index === current.answer;
        if (correct) stats.correct += 1;
        else stats.wrong += 1;
        const callback = resultHandler;
        if (correct) closeOverlay();
        callback(correct);
        if (!correct) showFeedback(false);
        return true;
    }

    function handleKeydown(event) {
        if (!current || answered) return;
        const { answers } = elements();
        const buttons = Array.from(answers?.children || []);
        if (!buttons.length) return;
        const key = String(event.key || '').toLowerCase();
        if (/^[1-4]$/.test(key)) {
            event.preventDefault?.();
            answer(Number(key) - 1);
        } else if (key === 'arrowdown' || key === 'arrowright') {
            event.preventDefault?.();
            selectedIndex = (selectedIndex + 1) % buttons.length;
            updateSelection(buttons);
        } else if (key === 'arrowup' || key === 'arrowleft') {
            event.preventDefault?.();
            selectedIndex = (selectedIndex + buttons.length - 1) % buttons.length;
            updateSelection(buttons);
        } else if (key === 'enter') {
            event.preventDefault?.();
            answer(selectedIndex);
        }
    }

    function ask(options = {}) {
        const { overlay, head, context, question, image, answers, feedback } = elements();
        if (!overlay || !head || !context || !question || !image || !answers || !feedback) {
            throw new Error('出題の器が見つかりません。');
        }
        closeOverlay();
        const picked = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
        current = picked;
        answered = false;
        selectedIndex = 0;
        resultHandler = typeof options.onResult === 'function' ? options.onResult : () => {};
        continueHandler = typeof options.onContinue === 'function' ? options.onContinue : () => {};
        stats.asked += 1;
        const ctx = typeof options.ctxFn === 'function'
            ? options.ctxFn(picked)
            : options.ctx ?? 'レベルアップのお祝い問題です。';
        context.innerHTML = String(ctx);
        question.textContent = picked.q;
        image.textContent = 'ダミー問題';
        clearChildren(head);
        const hint = root.document.createElement('button');
        hint.type = 'button';
        hint.className = 'hint-button';
        hint.textContent = '💡 ヒント';
        hint.setAttribute('aria-expanded', 'false');
        hint.addEventListener('click', () => showHint(hint));
        head.appendChild(hint);
        clearChildren(answers);
        picked.choices.forEach((choice, index) => {
            const button = root.document.createElement('button');
            button.type = 'button';
            button.className = 'quiz-answer';
            button.textContent = `${index + 1}. ${choice}`;
            button.setAttribute('aria-label', `${index + 1}番 ${choice}`);
            button.addEventListener('click', () => answer(index));
            answers.appendChild(button);
        });
        updateSelection(Array.from(answers.children || []));
        feedback.textContent = '';
        feedback.hidden = true;
        overlay.hidden = false;
        overlay.classList?.add('show');
        overlay.setAttribute?.('aria-hidden', 'false');
        return picked;
    }

    const Quiz = Object.freeze({
        ask,
        hideOverlay: closeOverlay,
        getStats: () => ({ ...stats }),
        resetStats: () => {
            stats.asked = 0;
            stats.correct = 0;
            stats.wrong = 0;
        }
    });

    root.document?.addEventListener?.('keydown', handleKeydown);
    root.Quiz = Quiz;
    if (typeof module !== 'undefined' && module.exports) module.exports = { Quiz, QUESTION_BANK: QUESTIONS };
})(typeof globalThis !== 'undefined' ? globalThis : window);
