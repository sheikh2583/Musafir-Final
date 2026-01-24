import quranWords from '../data/quranWords.json';
import QuizStatsService from '../services/QuizStatsService';

class QuizGenerator {

    // Calculate weight: Higher weight = more likely to effect
    // Formula: Base weight + (Wrong * 10) - (Correct * 2)
    // Ensure weight is never below 1
    calculateWeight(word, stats) {
        let weight = 10; // Base weight

        if (stats) {
            weight += (stats.wrong * 20); // Heavily penalize wrongs (show more often)
            weight -= (stats.correct * 2); // Slightly reduce frequency for correct

            // If never seen, give it a slight boost to introduce it
            if (stats.lastSeen === 0) {
                weight += 5;
            }
        }

        return Math.max(1, weight);
    }

    async generateQuestion() {
        // Ensure stats are loaded
        await QuizStatsService.init();

        const pool = quranWords.map(word => {
            const stats = QuizStatsService.getWordStat(word.id);
            return {
                ...word,
                weight: this.calculateWeight(word, stats)
            };
        });

        // Weighted Random Selection for the Question
        const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
        let randomValue = Math.random() * totalWeight;
        let selectedQuestion = null;

        for (const item of pool) {
            randomValue -= item.weight;
            if (randomValue <= 0) {
                selectedQuestion = item;
                break;
            }
        }

        // Fallback if something goes wrong with float precision
        if (!selectedQuestion) {
            selectedQuestion = pool[Math.floor(Math.random() * pool.length)];
        }

        // Select Distractors (Purely random, excluding the answer)
        const otherWords = pool.filter(w => w.id !== selectedQuestion.id);
        const distractors = this.shuffleArray(otherWords).slice(0, 3);

        // Combine and shuffle options
        const options = this.shuffleArray([selectedQuestion, ...distractors]);

        return {
            word: selectedQuestion,
            options: options
        };
    }

    shuffleArray(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
}

export default new QuizGenerator();
