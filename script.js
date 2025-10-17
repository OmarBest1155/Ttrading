// Initialize global variables
let userBalance = parseFloat(localStorage.getItem('userBalance')) || 0;
let userGoal = parseFloat(localStorage.getItem('userGoal')) || 0;
let trades = JSON.parse(localStorage.getItem('trades')) || [];
let tradingDays = JSON.parse(localStorage.getItem('tradingDays')) || [];
let currentTradingDay = JSON.parse(localStorage.getItem('currentTradingDay')) || null;
// settings: balance, tradeFeePercent, goal
let settings = JSON.parse(localStorage.getItem('settings')) || {
    tradeFeePercent: 0
};

document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
    initializeTradeForm();
    initializeFilters();
    initializeSettings();

    if (!localStorage.getItem('userBalance')) {
        showOnboarding();
    } else {
        updateDashboard();
    }

    // Ensure balance display is always present
    const header = document.querySelector('header');
    let balanceDisplay = document.querySelector('.balance-display');
    if (!balanceDisplay) {
        balanceDisplay = document.createElement('div');
        balanceDisplay.className = 'balance-display';
        header.prepend(balanceDisplay);
    }
    updateBalanceDisplay(); // Update the balance display content

    const toggleExitModeBtn = document.getElementById('toggle-exit-mode');
    const exitInput = document.getElementById('exit');
    const entryInput = document.getElementById('entry');
    const allInBtn = document.getElementById('all-in-btn');
    const sizeInput = document.getElementById('size');

    if (sizeInput) {
        sizeInput.setAttribute('step', '0.01'); // Allow decimal numbers
    }

    let isPercentageMode = false;

    if (toggleExitModeBtn && exitInput && entryInput) {
        toggleExitModeBtn.addEventListener('click', () => {
            isPercentageMode = !isPercentageMode;
            toggleExitModeBtn.textContent = isPercentageMode ? 'Percentage' : 'Number';

            if (isPercentageMode) {
                exitInput.placeholder = 'Enter % change';
            } else {
                exitInput.placeholder = 'Enter exit price';
            }
        });

        exitInput.addEventListener('input', () => {
            const entryPrice = parseFloat(entryInput.value) || 0;
            const inputValue = parseFloat(exitInput.value) || 0;

            if (isPercentageMode) {
                const calculatedExit = entryPrice * (1 + inputValue / 100);
                exitInput.value = calculatedExit.toFixed(2);
            }
        });
    }

    if (allInBtn && sizeInput && entryInput) {
        allInBtn.addEventListener('click', () => {
            const entryPrice = parseFloat(entryInput.value) || 1; // Avoid division by zero
            const positionSize = userBalance / entryPrice;
            sizeInput.value = positionSize.toFixed(2);
        });
    }

    const currentTimeBtn = document.getElementById('current-time-btn');
    const dateInput = document.getElementById('date');

    if (currentTimeBtn && dateInput) {
        currentTimeBtn.addEventListener('click', () => {
            const now = new Date();
            const formattedDate = now.toISOString().slice(0, 16); // Format as yyyy-MM-ddTHH:mm
            dateInput.value = formattedDate;
        });
    }

    // Render portfolio performance by trade chart
    renderPortfolioTradeChart();

    // Render portfolio performance by day chart
    renderPortfolioDayChart();

    // Calculate and display total win and total loss
    calculateTotalWinLoss();

    // Render additional charts
    renderWinLossRatioChart();
    renderTradeDistributionChart();

    const tradingDayContainer = document.getElementById('trading-day-container');

    if (tradingDayContainer) {
        tradingDayContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('btn-trash')) {
                const dayId = event.target.getAttribute('data-day-id');
                deleteTradingDay(dayId);
            }
        });
    }

    const tradeForm = document.getElementById('trade-form');
    if (tradeForm) {
        tradeForm.addEventListener('submit', (event) => {
            event.preventDefault();
            logNewTrade();
            location.reload(); // Refresh the page after logging a trade
        });
    }

    const startDayBtn = document.getElementById('start-day-btn');
    if (startDayBtn) {
        startDayBtn.addEventListener('click', () => {
            startNewTradingDay();
            location.reload(); // Refresh the page after starting a new day
        });
    }
});

function showOnboarding() {
    const overlay = document.getElementById('onboardingOverlay');
    const nextBtn = document.getElementById('onboardingNext');
    let currentStep = 1;

    // Show overlay with animation
    overlay.style.display = 'flex';
    setTimeout(() => {
        overlay.classList.add('visible');
    }, 100);

    // Initialize first step and dots
    document.querySelector(`.step[data-step="1"]`).classList.add('active');
    
    // Make dots clickable
    const dots = document.querySelectorAll('.progress-dot');
    dots.forEach(dot => {
        dot.style.cursor = 'pointer';
        dot.addEventListener('click', () => {
            const step = parseInt(dot.getAttribute('data-step'));
            if (step === 2 && !userBalance) {
                showInputError('initialBalance', 'Please complete step 1 first');
                return;
            }
            moveToStep(step);
            currentStep = step;
        });
    });

    nextBtn.addEventListener('click', () => {
        if (currentStep === 1) {
            const balance = parseFloat(document.getElementById('initialBalance').value);
            if (!balance || balance <= 0) {
                showInputError('initialBalance', 'Please enter a valid balance');
                return;
            }
            userBalance = balance;
            currentStep = 2;
            moveToStep(2);
        } else if (currentStep === 2) {
            const goal = parseFloat(document.getElementById('profitGoal').value) || 0;
            userGoal = goal;
            
            // Save to localStorage
            localStorage.setItem('userBalance', userBalance.toString());
            localStorage.setItem('userGoal', userGoal.toString());
            
            // Close modal with animation
            overlay.classList.remove('visible');
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 500);
            
            // Update dashboard
            updateDashboard();
            
            // Clear form
            document.getElementById('initialBalance').value = '';
            document.getElementById('profitGoal').value = '';
        }
    });
}

function showInputError(inputId, message) {
    const input = document.getElementById(inputId);
    input.classList.add('error');
    
    // Create error message if it doesn't exist
    if (!input.nextElementSibling?.classList.contains('error-message')) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        input.parentNode.insertBefore(errorDiv, input.nextSibling);
        
        // Shake animation
        input.style.animation = 'shake 0.5s ease';
        setTimeout(() => {
            input.style.animation = '';
        }, 500);
    }
    
    // Remove error after user starts typing
    input.addEventListener('input', function removeError() {
        input.classList.remove('error');
        const errorMessage = input.nextElementSibling;
        if (errorMessage?.classList.contains('error-message')) {
            errorMessage.remove();
        }
        input.removeEventListener('input', removeError);
    });
}

function moveToStep(step) {
    const steps = document.querySelectorAll('.step');
    const dots = document.querySelectorAll('.progress-dot');
    const line = document.querySelector('.progress-line');
    const button = document.getElementById('onboardingNext');
    
    steps.forEach(s => s.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));
    
    document.querySelector(`.step[data-step="${step}"]`).classList.add('active');
    document.querySelector(`.progress-dot[data-step="${step}"]`).classList.add('active');
    
    // Update progress line
    if (step === 2) {
        line.classList.add('active');
        button.innerHTML = '<span>Get Started</span><i class="fas fa-check"></i>';
    } else {
        line.classList.remove('active');
        button.innerHTML = '<span>Next</span><i class="fas fa-arrow-right"></i>';
    }
    
    // Animate the transition
    steps.forEach(s => s.style.animation = 'none');
    const activeStep = document.querySelector(`.step[data-step="${step}"]`);
    activeStep.style.animation = 'fadeIn 0.3s forwards';
}

function initializeNavigation() {
    const navLinks = document.querySelectorAll('.sidebar nav ul li a');
    const sections = document.querySelectorAll('.content-section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(section => section.classList.remove('active'));
            this.classList.add('active');
            const sectionId = this.getAttribute('data-section');
            const targetSection = document.getElementById(sectionId);
            targetSection.classList.add('active');
        });
    });
}

function updateUserBalance(newBalance) {
    userBalance = newBalance;
    localStorage.setItem('userBalance', userBalance.toString());
    updateBalanceDisplay();
}

function initializeTradeForm() {
    const tradeForm = document.getElementById('trade-form');
    if (tradeForm) {
        // Add input animation handlers
        const formGroups = tradeForm.querySelectorAll('.form-group');
        formGroups.forEach(group => {
            const input = group.querySelector('input, select, textarea');
            if (input) {
                input.addEventListener('focus', () => {
                    group.classList.add('active');
                });
                input.addEventListener('blur', () => {
                    group.classList.remove('active');
                });
                input.addEventListener('input', () => {
                    if (input.value) {
                        group.classList.add('has-value');
                    } else {
                        group.classList.remove('has-value');
                    }
                });
            }
        });

        tradeForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const rawPL = calculatePL(
                document.getElementById('type').value,
                parseFloat(document.getElementById('entry').value),
                parseFloat(document.getElementById('exit').value),
                parseInt(document.getElementById('size').value)
            );

            // apply trade fee (percentage of absolute P/L)
            const fee = (Math.abs(rawPL) * (parseFloat(settings.tradeFeePercent || 0) / 100));
            const tradePL = rawPL >= 0 ? rawPL - fee : rawPL + fee; // subtract fee from profits, add to losses

            const trade = {
                id: Date.now(),
                date: document.getElementById('date').value,
                symbol: document.getElementById('symbol').value.toUpperCase(),
                type: document.getElementById('type').value,
                entry: parseFloat(document.getElementById('entry').value),
                exit: parseFloat(document.getElementById('exit').value),
                size: parseInt(document.getElementById('size').value),
                risk: parseFloat(document.getElementById('risk').value),
                notes: document.getElementById('notes').value,
                pl: tradePL
            };

            // assign day if a trading day is active (mutates trade and currentTradingDay)
            assignDayToTrade(trade);
            // add trade once and persist
            trades.unshift(trade);
            localStorage.setItem('trades', JSON.stringify(trades));

            // Update user balance based on trade P/L
            const newBalance = userBalance + trade.pl;
            updateUserBalance(newBalance);

            // If a trading day is active, record this trade id in the currentTradingDay object
            if (currentTradingDay && currentTradingDay.isActive) {
                currentTradingDay.trades = currentTradingDay.trades || [];
                currentTradingDay.trades.push(trade.id);
                localStorage.setItem('currentTradingDay', JSON.stringify(currentTradingDay));
            }
            
            updateDashboard();
            tradeForm.reset();
            alert('Trade logged successfully!');
            // reload to ensure UI and stored values are consistent
            setTimeout(() => location.reload(), 150);
        });
    }
}

function initializeSettings() {
    const balanceInput = document.getElementById('settings-balance');
    const feeInput = document.getElementById('settings-fee');
    const goalInput = document.getElementById('settings-goal');
    const saveBtn = document.getElementById('save-settings');
    const resetGoalBtn = document.getElementById('reset-goal');

    if (balanceInput) balanceInput.value = userBalance || '';
    if (feeInput) feeInput.value = settings.tradeFeePercent || 0;
    if (goalInput) goalInput.value = userGoal || '';

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const newBal = parseFloat(balanceInput.value);
            const newFee = parseFloat(feeInput.value) || 0;
            const newGoal = parseFloat(goalInput.value);

            if (!isNaN(newBal)) {
                updateUserBalance(newBal);
            }

            settings.tradeFeePercent = newFee;
            localStorage.setItem('settings', JSON.stringify(settings));

            if (!isNaN(newGoal)) {
                userGoal = newGoal;
                localStorage.setItem('userGoal', userGoal.toString());
            }

            showNotification('Settings saved', 'success');
            updateDashboard();
        });
    }

    if (resetGoalBtn) {
        resetGoalBtn.addEventListener('click', () => {
            userGoal = 0;
            localStorage.removeItem('userGoal');
            showNotification('Goal removed', 'success');
            updateDashboard();
        });
    }
}

function calculatePL(type, entry, exit, size) {
    return type === 'LONG' 
        ? (exit - entry) * size
        : (entry - exit) * size;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function createDayEndAnimation(percentageChange) {
    const container = document.querySelector('.main-content');
    if (!container) return;

    const element = document.createElement('div');
    element.className = 'day-end-animation';
    
    const isPositive = percentageChange >= 0;
    const symbol = isPositive ? '📈' : '📉';
    const color = isPositive ? '#4CAF50' : '#f44336';
    
    element.innerHTML = `
        <div class="day-end-content ${isPositive ? 'positive' : 'negative'}">
            <span class="symbol">${symbol}</span>
            <span class="percentage">${percentageChange.toFixed(2)}%</span>
        </div>
    `;
    
    container.appendChild(element);
    
    setTimeout(() => {
        element.classList.add('animate');
        if (isPositive) createMoneyRain();
    }, 100);
    
    setTimeout(() => {
        element.classList.remove('animate');
        setTimeout(() => element.remove(), 300);
    }, 3000);
}

function createTradingDayContainer() {
    const container = document.createElement('div');
    container.id = 'trading-day-container';
    container.className = 'trading-day-container';
    
    // Find a suitable place to insert the container
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.insertBefore(container, mainContent.firstChild);
    }
    
    return container;
}

function updateDashboard() {
    const totalPL = trades.reduce((sum, trade) => sum + trade.pl, 0);
    const currentBalance = userBalance + totalPL;
    const goalProgress = userGoal ? (totalPL / userGoal) * 100 : 0;
    
    // Update dashboard summary with new balance info
    updateSummaryCards(currentBalance, goalProgress);
    updateRecentTrades();
    updateTradeHistory();
    updateTradingDayDisplay();
    if (trades.length > 0) {
        updateAnalytics();
    }

    // Update trades needed to reach goal
    const tradesNeededElement = document.getElementById('trades-needed');
    if (tradesNeededElement) {
        const tradesNeeded = calculateTradesNeeded();
        tradesNeededElement.textContent = tradesNeeded === Infinity ? 'N/A' : tradesNeeded;
    }
}

function calculateTradesNeeded() {
    if (!userGoal || userGoal <= userBalance) {
        return 0; // Goal already reached or not set
    }

    // Use only the most recent trade's percent change as the expected per-trade return
    if (trades.length === 0) return Infinity;

    const lastTrade = trades[0];
    // prefer percentChange if recorded, otherwise compute percent from pl and size/entry
    let perTradePercent = lastTrade.percentChange;
    if (typeof perTradePercent === 'undefined' || perTradePercent === null) {
        // compute approximate percent: pl / (start-equivalent)
        const entry = parseFloat(lastTrade.entry) || 0;
        const pl = parseFloat(lastTrade.pl) || 0;
        const notional = entry * (parseFloat(lastTrade.size) || 1);
        perTradePercent = notional ? (pl / notional) * 100 : 0;
    }

    if (perTradePercent <= 0) return Infinity;

    const remainingGoal = userGoal - userBalance;
    const perTradeDollar = userBalance * (perTradePercent / 100);
    if (perTradeDollar <= 0) return Infinity;
    return Math.ceil(remainingGoal / perTradeDollar);
}

function updateSummaryCards(currentBalance, goalProgress) {
    const totalPL = trades.reduce((sum, trade) => sum + trade.pl, 0);
    const winningTrades = trades.filter(trade => trade.pl > 0);
    const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;

    // Update theme based on total P/L
    updateTheme(totalPL);

    // Animate value changes
    const amounts = document.querySelectorAll('.amount');
    amounts.forEach(amount => {
        amount.classList.add('value-change');
        setTimeout(() => amount.classList.remove('value-change'), 300);
    });

    // Update summary cards
    const profitAmount = document.querySelector('.profit .amount');
    const winRateAmount = document.querySelector('.win-rate .amount');
    const tradesAmount = document.querySelector('.trades .amount');

    if (profitAmount) profitAmount.textContent = totalPL.toFixed(2);
    if (winRateAmount) winRateAmount.textContent = winRate.toFixed(1) + '%';
    if (tradesAmount) tradesAmount.textContent = trades.length;

    // Update balance display
    const balanceDisplay = document.querySelector('.balance-display');
    if (balanceDisplay) {
        const balanceHTML = '<div class="balance-info">' +
            '<span class="balance-label">Current Balance</span>' +
            '<span class="balance-amount ' + (totalPL >= 0 ? 'positive' : 'negative') + '">$' + 
            currentBalance.toFixed(2) + '</span>' +
            '</div>';

        let goalHTML = '';
        if (userGoal) {
            goalHTML = '<div class="goal-progress">' +
                '<div class="progress-bar">' +
                '<div class="progress-fill" style="width: ' + Math.min(goalProgress, 100) + '%"></div>' +
                '</div>' +
                '<span class="goal-text">Goal Progress: ' + goalProgress.toFixed(1) + '%</span>' +
                '</div>';
        }

        balanceDisplay.innerHTML = balanceHTML + goalHTML;
    }
}

    // Add money rain effect on positive total P/L
    if (totalPL > 0) {
        createMoneyRain();
    }

function updateTheme(totalPL) {
    const root = document.documentElement;
    const newTheme = totalPL >= 0 ? '' : 'loss';
    
    if (root.getAttribute('data-theme') !== newTheme) {
        root.setAttribute('data-theme', newTheme);
        
        // Add smooth transition class
        document.body.classList.add('theme-transitioning');
        
        // Remove transition class after animation completes
        setTimeout(() => {
            document.body.classList.remove('theme-transitioning');
        }, 500);
    }
}

function createMoneyRain() {
    const moneySymbols = ['💰', '💵', '💸'];
    const container = document.querySelector('.main-content');
    
    if (!container) return;
    
    for (let i = 0; i < 20; i++) {
        const money = document.createElement('span');
        money.textContent = moneySymbols[Math.floor(Math.random() * moneySymbols.length)];
        
        money.style.position = 'absolute';
        money.style.left = (Math.random() * 100) + '%';
        money.style.top = '-20px';
        money.style.fontSize = '20px';
        money.style.transform = 'translateY(0)';
        money.style.opacity = '0';
        money.style.pointerEvents = 'none';
        money.style.animation = 'moneyRain 1s ease-out forwards';
        money.style.animationDelay = (Math.random() * 2) + 's';
        
        const rotation = Math.random() * 360;
        money.style.transform = `rotate(${rotation}deg)`;
        money.style.transition = 'transform 1s ease-out';
        
        container.appendChild(money);
        
        // Remove the element after animation
        setTimeout(() => money.remove(), 3000);
    }
}

function updateRecentTrades() {
    const recentTradesBody = document.getElementById('recent-trades-body');
    if (recentTradesBody) {
        recentTradesBody.innerHTML = trades.slice(0, 5).map(trade => {
            const dayLabel = typeof trade.day !== 'undefined' && trade.day !== null ?
                `<span class="day-badge">${trade.day}</span>` :
                `<span class="day-badge no-day">No Day</span>`;
            return `
            <tr>
                <td>${dayLabel}</td>
                <td>${new Date(trade.date).toLocaleDateString()}</td>
                <td>${trade.symbol}</td>
                <td>${trade.type}</td>
                <td>$${trade.entry}</td>
                <td>$${trade.exit}</td>
                <td class="${trade.pl >= 0 ? 'profit' : 'loss'}">$${trade.pl.toFixed(2)}</td>
            </tr>
        `}).join('');
    }
}

function updateTradeHistory() {
    const historyBody = document.getElementById('history-trades-body');
    if (historyBody) {
        const tradeRows = trades.map(trade => {
            const profitClass = trade.pl >= 0 ? 'profit' : 'loss';
            const arrow = trade.pl >= 0 ? '↗️' : '↘️';
            const tradeDate = new Date(trade.date);
            const date = tradeDate.toLocaleDateString();
            const time = tradeDate.toLocaleTimeString();
            const row = document.createElement('tr');
            row.className = 'trade-row ' + profitClass;
            
            // Assign day label if not present (default to null)
            if (typeof trade.day === 'undefined') trade.day = null;

            // Calculate percentage change for this trade
            const balanceBeforeTrade = calculateBalanceAtTime(tradeDate);
            const percentageChange = ((trade.pl / (balanceBeforeTrade || 1)) * 100).toFixed(2);
            trade.percentChange = percentageChange; // Store percent change in trade object
            
            row.innerHTML = 
                '<td>' + (trade.day ? ('<span class="day-badge">' + trade.day + '</span>') : '<span class="day-badge no-day">No Day</span>') + '</td>' +
                '<td>' + date + '</td>' +
                '<td>' + trade.symbol + '</td>' +
                '<td>' + trade.type + '</td>' +
                '<td>$' + trade.entry + '</td>' +
                '<td>$' + trade.exit + '</td>' +
                '<td>' + trade.size + '</td>' +
                '<td class="pl-value ' + profitClass + '">' +
                    '<span class="arrow">' + arrow + '</span>' +
                    '<span class="amount">$' + trade.pl.toFixed(2) + '</span>' +
                '</td>' +
                '<td>' +
                    '<button onclick="deleteTrade(' + trade.id + ')" class="btn-delete">' +
                        '<i class="fas fa-trash"></i>' +
                    '</button>' +
                '</td>';
            return row;
        });
        
        historyBody.innerHTML = '';
        tradeRows.forEach(row => historyBody.appendChild(row));
    }
}

// Helper: assign current day number to trades that are logged while a day is active
function assignDayToTrade(trade) {
    if (currentTradingDay && currentTradingDay.isActive) {
        // Determine day number: if currentTradingDay already has a 'number', use it; otherwise compute next
        if (!currentTradingDay.number) {
            // day number is 1-based and increments by length of existing tradingDays
            currentTradingDay.number = (tradingDays.length > 0 ? (Math.max(...tradingDays.map(d => d.number || 0)) + 1) : 1);
        }
        trade.day = currentTradingDay.number;
        // record trade id in currentTradingDay
        currentTradingDay.trades = currentTradingDay.trades || [];
        currentTradingDay.trades.push(trade.id);
        localStorage.setItem('currentTradingDay', JSON.stringify(currentTradingDay));
    } else {
        trade.day = null;
    }
}

function initializeFilters() {
    const symbolFilter = document.getElementById('symbol-filter');
    const typeFilter = document.getElementById('type-filter');
    const dateFilter = document.getElementById('date-filter');

    [symbolFilter, typeFilter, dateFilter].forEach(filter => {
        if (filter) {
            filter.addEventListener('change', filterTrades);
        }
    });
}

function filterTrades() {
    const symbol = document.getElementById('symbol-filter').value.toUpperCase();
    const type = document.getElementById('type-filter').value;
    const date = document.getElementById('date-filter').value;

    const filteredTrades = trades.filter(trade => {
        const symbolMatch = !symbol || trade.symbol.includes(symbol);
        const typeMatch = !type || trade.type === type;
        const dateMatch = !date || trade.date.includes(date);
        return symbolMatch && typeMatch && dateMatch;
    });

    const historyBody = document.getElementById('history-trades-body');
    if (historyBody) {
        historyBody.innerHTML = filteredTrades.map(trade => `
            <tr>
                <td>${new Date(trade.date).toLocaleDateString()}</td>
                <td>${trade.symbol}</td>
                <td>${trade.type}</td>
                <td>$${trade.entry}</td>
                <td>$${trade.exit}</td>
                <td>${trade.size}</td>
                <td class="${trade.pl >= 0 ? 'profit' : 'loss'}">$${trade.pl.toFixed(2)}</td>
                <td>
                    <button onclick="deleteTrade(${trade.id})" class="btn-delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }
}

function deleteTrade(id) {
    if (confirm('Are you sure you want to delete this trade?')) {
        // Find the trade to be deleted
        const tradeToDelete = trades.find(trade => trade.id === id);

        if (tradeToDelete) {
            // Adjust the user balance dynamically
            const newBalance = userBalance - tradeToDelete.pl;
            updateUserBalance(newBalance);
        }

        // Remove from global trades
        trades = trades.filter(trade => trade.id !== id);
        localStorage.setItem('trades', JSON.stringify(trades));

        // If a trading day is active, remove the trade id from it
        if (currentTradingDay && currentTradingDay.trades) {
            currentTradingDay.trades = currentTradingDay.trades.filter(tid => tid !== id);
            localStorage.setItem('currentTradingDay', JSON.stringify(currentTradingDay));
        }

        // Remove the trade from any saved tradingDays and recompute their end balances
        let changed = false;
        tradingDays = tradingDays.map(day => {
            if (day.trades && day.trades.includes(id)) {
                day.trades = day.trades.filter(tid => tid !== id);
                changed = true;
            }
            // Recompute endBalance based on remaining trades on that day
            const dayDateStr = new Date(day.date).toDateString();
            const dayPL = trades.reduce((sum, t) => {
                return (new Date(t.date).toDateString() === dayDateStr) ? sum + (t.pl || 0) : sum;
            }, 0);
            day.endBalance = (parseFloat(day.startBalance) || 0) + dayPL;
            day.percentageChange = (day.startBalance) ? ((day.endBalance - day.startBalance) / day.startBalance) * 100 : 0;
            return day;
        });
        if (changed) {
            localStorage.setItem('tradingDays', JSON.stringify(tradingDays));
        } else {
            // still update tradingDays so end balances reflect change
            localStorage.setItem('tradingDays', JSON.stringify(tradingDays));
        }

        updateDashboard();
    }
}

function deleteTradingDay(dayId) {
    if (!confirm('Delete this trading day from history? This will also remove all trades linked to that day.')) return;
    // Find the day object to delete
    const dayToDelete = tradingDays.find(d => d.id === dayId);
    const dayNumber = dayToDelete ? dayToDelete.number : null;

    // Remove the day from saved days
    tradingDays = tradingDays.filter(d => d.id !== dayId);

    // If dayNumber exists, remove trades that have that day number
    if (dayNumber !== null && typeof dayNumber !== 'undefined') {
        const removedTrades = trades.filter(t => t.day === dayNumber);
        // Adjust user balance by subtracting the removed trades' P/L (since they were added to balance)
        const totalRemovedPL = removedTrades.reduce((sum, t) => sum + (t.pl || 0), 0);
        if (totalRemovedPL !== 0) {
            const newBalance = (parseFloat(userBalance) || 0) - totalRemovedPL;
            updateUserBalance(newBalance);
        }
        // Remove the trades from the trades array
        trades = trades.filter(t => t.day !== dayNumber);
        localStorage.setItem('trades', JSON.stringify(trades));
    }

    localStorage.setItem('tradingDays', JSON.stringify(tradingDays));
    updateTradingDayDisplay();
    showNotification('Trading day and its trades removed from history', 'success');
    setTimeout(() => location.reload(), 150);
}

function updateAnalytics() {
    const winningTrades = trades.filter(trade => trade.pl > 0);
    const losingTrades = trades.filter(trade => trade.pl < 0);

    updateMetricValue('avg-win', winningTrades.length > 0
        ? (winningTrades.reduce((sum, trade) => sum + trade.pl, 0) / winningTrades.length).toFixed(2)
        : '0.00');

    updateMetricValue('avg-loss', losingTrades.length > 0
        ? (losingTrades.reduce((sum, trade) => sum + trade.pl, 0) / losingTrades.length).toFixed(2)
        : '0.00');

    updateMetricValue('largest-win', winningTrades.length > 0
        ? Math.max(...winningTrades.map(trade => trade.pl)).toFixed(2)
        : '0.00');

    updateMetricValue('largest-loss', losingTrades.length > 0
        ? Math.min(...losingTrades.map(trade => trade.pl)).toFixed(2)
        : '0.00');

    // Compute total money won vs total money lost
    const totalWon = winningTrades.reduce((sum, t) => sum + (t.pl || 0), 0);
    const totalLost = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pl || 0), 0));
    const moneyWinPercent = (totalWon + totalLost) === 0 ? 0 : (totalWon / (totalWon + totalLost)) * 100;
    const moneyWinEl = document.getElementById('money-win-percent');
    if (moneyWinEl) moneyWinEl.textContent = moneyWinPercent.toFixed(1) + '%';
}

function calculateBalanceAtTime(targetDate) {
    // Use the stored `userBalance` as the authoritative running balance.
    // Historical reconstruction from trades may double-count because userBalance is updated
    // when trades are logged. Return current userBalance for consistent behavior.
    return parseFloat(userBalance) || 0;
}

function updateMetricValue(elementId, value) {
    const element = document.getElementById(elementId);
    const isPositive = parseFloat(value) >= 0;
    const formattedValue = `$${value}`;
    
    element.textContent = formattedValue;
    element.className = 'value ' + (isPositive ? 'positive' : 'negative');
    
    // Add value change animation
    element.classList.add('value-change');
    setTimeout(() => element.classList.remove('value-change'), 300);
}

function startTradingDay() {
    if (currentTradingDay) {
        showNotification('A trading day is already in progress!', 'warning');
        return;
    }

    // Determine base balance from userBalance only (no double-counting trades)
    const baseBalance = parseFloat(userBalance) || 0;

    // Check if there's an optional allocation input on the UI (e.g., an input with id 'day-allocation')
    // If present, subtract it from baseBalance to derive the actual starting balance for the day
    let allocation = 0;
    const allocInput = document.getElementById('day-allocation');
    if (allocInput) {
        allocation = parseFloat(allocInput.value) || 0;
    }

    const startBalance = baseBalance - allocation;

    const newDay = {
        id: Date.now(),
        date: new Date().toISOString(),
        // starting balance equals the user's current stored balance minus any allocation
        startBalance: startBalance,
        // keep a placeholder for endBalance (will be set when ending the day)
        endBalance: null,
        trades: [],
        isActive: true
    };

    currentTradingDay = newDay;
    localStorage.setItem('currentTradingDay', JSON.stringify(currentTradingDay));
    showNotification('New trading day started!', 'success');
    updateTradingDayDisplay();
    // Persist only the single source of truth for balance
    saveBalanceToStorage();
    // reload to ensure UI consistency across components
    setTimeout(() => location.reload(), 150);
}

function endTradingDay() {
    if (!currentTradingDay) {
        showNotification('No trading day in progress!', 'warning');
        return;
    }

    // Use the stored userBalance as final/current balance. This assumes userBalance
    // has been updated when trades were logged/removed and is the single source of truth.
    const currentBalance = parseFloat(userBalance) || 0;

    // finalize the trading day with accurate end balance
    currentTradingDay.endBalance = currentBalance;
    currentTradingDay.isActive = false;

    // compute stats now that we have start/end balances
    const dayStats = calculateDayStats(currentTradingDay);
    currentTradingDay.percentageChange = dayStats.percentageChange;
    currentTradingDay.absoluteChange = dayStats.absoluteChange;

    // Ensure the day has a sequential visible number (compute from existing days)
    if (!currentTradingDay.number) {
        const maxNum = tradingDays.length > 0 ? Math.max(...tradingDays.map(d => d.number || 0)) : 0;
        currentTradingDay.number = maxNum + 1;
    }
    // Persist the day itself once
    tradingDays.unshift(currentTradingDay);
    localStorage.setItem('tradingDays', JSON.stringify(tradingDays));

    // Update persisted trades to keep the day assignment for history
    const tradeIds = currentTradingDay.trades || [];
    trades = trades.map(t => {
        if (tradeIds.includes(t.id)) {
            t.day = currentTradingDay.number;
        }
        return t;
    });
    localStorage.setItem('trades', JSON.stringify(trades));
    localStorage.removeItem('currentTradingDay');
    currentTradingDay = null;

    showNotification(`Trading day ended! ${dayStats.summary}`, 'success');
    updateTradingDayDisplay();
    createDayEndAnimation(dayStats.percentageChange);
}

function calculateDayStats(day) {
    const startBalance = parseFloat(day.startBalance) || 0;
    // if endBalance exists (closed day), use it; otherwise compute current balance from trades
    const endBalance = (day.endBalance !== null && typeof day.endBalance !== 'undefined')
        ? parseFloat(day.endBalance)
        : (parseFloat(userBalance) || 0);

    const absoluteChange = endBalance - startBalance;
    const percentageChange = startBalance ? (absoluteChange / startBalance) * 100 : 0;

    return {
        absoluteChange,
        percentageChange,
        summary: `${absoluteChange >= 0 ? '+' : ''}$${absoluteChange.toFixed(2)} (${percentageChange.toFixed(2)}%)`
    };
}

function updateTradingDayDisplay() {
    const container = document.getElementById('trading-day-container') || createTradingDayContainer();
    
    // Update current day status
    const currentDayStatus = document.createElement('div');
    currentDayStatus.className = 'current-day-status';
    
    if (currentTradingDay) {
        const stats = calculateDayStats(currentTradingDay);
        currentDayStatus.innerHTML = `
            <div class="current-day-header">
                <h3>📈 Current Trading Day</h3>
                <button onclick="endTradingDay()" class="btn-end-day">End Day</button>
            </div>
            <div class="day-stats">
                <span>Started: ${new Date(currentTradingDay.date).toLocaleString()}</span>
                <span class="stat ${stats.absoluteChange >= 0 ? 'positive' : 'negative'}">
                    ${stats.summary}
                </span>
            </div>
        `;
    } else {
        currentDayStatus.innerHTML = `
            <div class="current-day-header">
                <h3>📊 Trading Day</h3>
                <button onclick="startTradingDay()" class="btn-start-day">Start Day</button>
            </div>
        `;
    }
    
    // Update trading days history
    const historyContainer = document.createElement('div');
    historyContainer.className = 'trading-days-history';
    
    if (tradingDays.length > 0) {
        historyContainer.innerHTML = `
            <h3>Trading History</h3>
            <div class="days-list">
                ${tradingDays.map(day => {
                    const percentageChange = ((day.endBalance - day.startBalance) / day.startBalance) * 100;
                    const isPositive = day.endBalance >= day.startBalance;
                    return `
                        <div class="day-item ${isPositive ? 'positive' : 'negative'}">
                                    <div class="day-info">
                                        <span class="day-badge">${day.number || '—'}</span>
                                        <span class="day-date">${new Date(day.date).toLocaleDateString()}</span>
                                        <span class="day-change">
                                            ${isPositive ? '↗️' : '↘️'} 
                                            $${Math.abs(day.endBalance - day.startBalance).toFixed(2)} 
                                            (${percentageChange.toFixed(2)}%)
                                        </span>
                                    </div>
                            <div class="day-balance">
                                <span>Start: $${day.startBalance.toFixed(2)}</span>
                                <span>End: $${day.endBalance.toFixed(2)}</span>
                            </div>
                            <div class="day-actions">
                                <button class="btn-delete-day" onclick="deleteTradingDay(${day.id})">Delete</button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    container.innerHTML = '';
    container.appendChild(currentDayStatus);
    container.appendChild(historyContainer);
}

function updateBalance() {
    userBalance = trades.reduce((balance, trade) => balance + trade.profitLoss, 0);
    saveBalanceToStorage();
    updateBalanceDisplay();
}

function saveBalanceToStorage() {
    localStorage.setItem('userBalance', userBalance.toFixed(2));
}

function updateBalanceDisplay() {
    const balanceDisplay = document.querySelector('.balance-display');
    if (balanceDisplay) {
        const balanceHTML = '<div class="balance-info">' +
            '<span class="balance-label">Current Balance</span>' +
            '<span class="balance-amount ' + (userBalance >= 0 ? 'positive' : 'negative') + '">$' + 
            userBalance.toFixed(2) + '</span>' +
            '</div>';

        let goalHTML = '';
        if (userGoal) {
            const goalProgress = (userBalance / userGoal) * 100;
            goalHTML = '<div class="goal-progress">' +
                '<div class="progress-bar">' +
                '<div class="progress-fill" style="width: ' + Math.min(goalProgress, 100) + '%"></div>' +
                '</div>' +
                '<span class="goal-text">Goal Progress: ' + goalProgress.toFixed(1) + '%</span>' +
                '</div>';
        }

        balanceDisplay.innerHTML = balanceHTML + goalHTML;
    }
}

function renderPortfolioTradeChart() {
    const chartContainer = document.getElementById('portfolio-trade-chart');
    if (!chartContainer) return;

    // Example data for trades
    const tradeData = trades.map((trade, index) => ({
        tradeNumber: index + 1,
        profitLoss: trade.pl
    }));

    // Create a simple bar chart using HTML and CSS
    tradeData.forEach(data => {
        const bar = document.createElement('div');
        bar.className = 'bar';
        bar.style.height = `${Math.abs(data.profitLoss)}px`;
        bar.style.backgroundColor = data.profitLoss >= 0 ? 'green' : 'red';
        bar.title = `Trade ${data.tradeNumber}: ${data.profitLoss >= 0 ? '+' : ''}${data.profitLoss}`;
        chartContainer.appendChild(bar);
    });
}

function renderPortfolioDayChart() {
    const chartContainer = document.getElementById('portfolio-day-chart');
    if (!chartContainer) return;

    // Example data for daily performance
    const dayData = tradingDays.map(day => ({
        date: day.date,
        profitLoss: day.profitLoss
    }));

    // Create a simple bar chart using HTML and CSS
    dayData.forEach(data => {
        const bar = document.createElement('div');
        bar.className = 'bar';
        bar.style.height = `${Math.abs(data.profitLoss)}px`;
        bar.style.backgroundColor = data.profitLoss >= 0 ? 'green' : 'red';
        bar.title = `${data.date}: ${data.profitLoss >= 0 ? '+' : ''}${data.profitLoss}`;
        chartContainer.appendChild(bar);
    });
}

function renderWinLossRatioChart() {
    const chartContainer = document.getElementById('win-loss-ratio-chart');
    if (!chartContainer) return;

    const wins = trades.filter(trade => trade.profitLoss > 0).length;
    const losses = trades.filter(trade => trade.profitLoss <= 0).length;

    const winBar = document.createElement('div');
    winBar.className = 'bar';
    winBar.style.height = `${wins * 10}px`;
    winBar.style.backgroundColor = 'green';
    winBar.title = `Wins: ${wins}`;

    const lossBar = document.createElement('div');
    lossBar.className = 'bar';
    lossBar.style.height = `${losses * 10}px`;
    lossBar.style.backgroundColor = 'red';
    lossBar.title = `Losses: ${losses}`;

    chartContainer.appendChild(winBar);
    chartContainer.appendChild(lossBar);
}

function renderTradeDistributionChart() {
    const chartContainer = document.getElementById('trade-distribution-chart');
    if (!chartContainer) return;

    const longTrades = trades.filter(trade => trade.type === 'LONG').length;
    const shortTrades = trades.filter(trade => trade.type === 'SHORT').length;

    const longBar = document.createElement('div');
    longBar.className = 'bar';
    longBar.style.height = `${longTrades * 10}px`;
    longBar.style.backgroundColor = 'blue';
    longBar.title = `Long Trades: ${longTrades}`;

    const shortBar = document.createElement('div');
    shortBar.className = 'bar';
    shortBar.style.height = `${shortTrades * 10}px`;
    shortBar.style.backgroundColor = 'orange';
    shortBar.title = `Short Trades: ${shortTrades}`;

    chartContainer.appendChild(longBar);
    chartContainer.appendChild(shortBar);
}

function calculateTotalWinLoss() {
    const totalWinElement = document.getElementById('total-win');
    const totalLossElement = document.getElementById('total-loss');

    if (!totalWinElement || !totalLossElement) return;

    let totalWin = 0;
    let totalLoss = 0;

    trades.forEach(trade => {
        if (trade.profitLoss > 0) {
            totalWin += trade.profitLoss;
        } else {
            totalLoss += trade.profitLoss;
        }
    });

    totalWinElement.textContent = `$${totalWin.toFixed(2)}`;
    totalLossElement.textContent = `$${Math.abs(totalLoss).toFixed(2)}`;
}
