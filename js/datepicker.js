(function($) {

    $.fn.datepicker = function() {

        var params = {

                text: {
                    monthsFull: [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ],
                    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                    weekdays: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
                },

                size: {
                    viewportHeight: $(window).height(),
                    popupHeight: 210
                },

                today: {
                    date: new Date().getDate(),
                    month: new Date().getMonth(),
                    year: new Date().getFullYear()
                }

            },

            calendar = {

                _isOpen: false,

                // 3 possible view states: days, months, years
                _viewState: 'days',

                // the currently modified date, which holds the calendar state (month/year/day-to-show)
                _date: {
                    date: 0,
                    month: 0,
                    year: 0
                },

                // stores the old date, needed to mark selected items
                _dateOld: {},

                // sets the number of preceding years to show (up to 19)
                _yearsToShow: 9,

                // reference to the input, calendar is currently open for
                _targetInstance: 0,

                initialize: function() {

                    this
                        .renderTemplates()
                        .findBlocks()
                        .bindEvents();

                },

                renderTemplates: function() {
                    $('body').append(this.calendarTemplate());
                    return this;
                },

                findBlocks: function() {

                    this.popup = $('.datepicker__calendar');
                    this.prev = $('.calendar__button_type_prev');
                    this.next = $('.calendar__button_type_next');
                    this.header = $('.calendar__button_type_current');

                    this.content = $('.calendar__content');
                    this.yearsWrap = $('.calendar__years');
                    this.datesWrap = $('.calendar__dates');
                    this.monthsWrap = $('.calendar__months');

                    this.today = $('.calendar__today');

                    return this;

                },

                bindEvents: function() {

                    $('html').on('click', this._onOutsideClick);

                    this.prev.on('click', this._onArrowClick);
                    this.next.on('click', this._onArrowClick);
                    this.header.on('click', $.proxy(this._onHeaderClick, this));

                    this.content.on('click', '.calendar__item', $.proxy(this._onItemClick, this));
                    this.today.on('click', $.proxy(this._onTodayClick, this));

                    return this;

                },

                /**
                 * Closing the calendar on outside click
                 */
                _onOutsideClick: function(e) {
                    !$(e.target).closest('.datepicker__calendar').length
                        && calendar.hide();
                },

                _onArrowClick: function(e) {
                    var increment = $(e.target).hasClass('calendar__button_type_prev') ? -1 : 1;
                    calendar.flipContent(increment);
                },

                /**
                 * Click on the header switches the view and updates the header itself
                 */
                _onHeaderClick: function() {

                    this
                        .switchView(true)
                        .fillHeader();

                },

                _onItemClick: function(e) {

                    var target = $(e.target),
                        value = target.text();

                    // if day is selected, the calendar will close and new date gets applied
                    if (this._viewState === 'days') {
                        this._date.date = +value;

                        // cases for dates from adjacent months
                        if (this.handleEdgeDate(target)) {
                            this.isEdgeMonth() && this.setNewYear();
                        }

                        this.setValue();
                        return;

                    }

                    if (this._viewState === 'months') {
                        this._date.month = $.inArray($(e.target).text(), params.text.months);
                        this.fillDays();
                    }

                    if (this._viewState === 'years')
                        this._date.year = +value;

                    this
                        .switchView()
                        .fillHeader();

                },

                _onTodayClick: function() {
                    this.setValue(true);
                },

                /**
                 * Sets the input value and hides the calendar
                 * @param {boolean} isToday
                 */
                setValue: function(isToday) {

                    var date = isToday
                        ? params.today
                        : this._date;

                    input.setValue(date, this._targetInstance);
                    this.hide();

                },

                /**
                 * Shows the calendar
                 * @param {object} target - container of the currently handled input
                 * @param {object} date - original input value
                 */
                show: function(target, date) {

                    this._dateOld = {
                        date: date.date,
                        month: date.month,
                        year: date.year
                    };

                    this
                        .selectItem('month')
                        .fill(date)
                        .position(target)
                        .popup.addClass('datepicker__calendar_visible_yes');

                    this._targetInstance = target.attr('class').split(' ')[1].match(/datepicker_instance_(\d)/)[1];

                    this._isOpen = true;

                },

                hide: function() {

                    this
                        .reset()
                        .popup.removeClass('datepicker__calendar_visible_yes');

                    this._isOpen = false;

                },

                /**
                 * There is just one calendar for all instances, so on close some settings need to be
                 * removed not to affect future calls
                 */
                reset: function() {

                    // makes the calendar show up with the days view next time
                    !this.content.hasClass('calendar__content_view_days')
                        && this.content
                            .addClass('calendar__content_view_days')
                            .removeClass('calendar__content_view_months calendar__content_view_years');

                    this._viewState = 'days';

                    return this;

                },

                /**
                 * Positions calendar based on input position and remaining space
                 * @param {object} targetContainer - container of the currently handled input
                 */
                position: function(targetContainer) {

                    var baseOffset = targetContainer.offset(),
                        inputHeight = targetContainer.outerHeight(),
                        popupHeight = params.size.popupHeight,
                        // in case popup doesn't fit, unfold direction changes
                        topOffset = (params.size.viewportHeight - (baseOffset.top + inputHeight) > popupHeight)
                            ? baseOffset.top + inputHeight
                            : baseOffset.top - popupHeight - 2;     // 2 for borders

                    this.popup.css({
                        height: popupHeight,
                        left: baseOffset.left,
                        top: topOffset
                    });

                    return this;

                },

                /**
                 * Days and years view containers are filled on calendar showing up
                 * @param {Object} date
                 */
                fill: function(date) {

                    this._date = date;

                    this
                        .fillDays()
                        .fillYears()
                        .fillHeader();

                    return this;

                },

                /**
                 * Fills the days container based on year and month
                 */
                fillDays: function() {

                    var html = '',
                        monthFirstDay = new Date(this._date.year, this._date.month, 1).getDay(),
                        daysLastMonth = new Date(this._date.year, this._date.month, 0).getDate(),
                        daysThisMonth = new Date(this._date.year, this._date.month + 1, 0).getDate(),
                        startDate = daysLastMonth - monthFirstDay + 1,      // Sunday is 0 -> +1
                        endDate = 42 - daysThisMonth - monthFirstDay + 1,
                        mod,
                        i;

                    // if the first week starts on Sunday, the whole week from the previous month shows up
                    if (monthFirstDay === 0) {
                        startDate -= 7;
                        endDate -= 7;
                    }

                    // last month
                    for (i = startDate; i <= daysLastMonth; i++) {
                        html += this.calendarItemTemplate('days', [i], 'prev');
                    }

                    // this month
                    for (i = 1; i < daysThisMonth + 1; i++) {

                        //highlighting selected date
                        mod = this.isSelected(this._date.year, params.text.months[this._date.month], i)
                            ? 'selected'
                            : '';

                        html += this.calendarItemTemplate('days', [i], mod);

                    }

                    // next month
                    for (i = 1; i < endDate; i++) {
                        html += this.calendarItemTemplate('days', [i], 'next');
                    }

                    this.datesWrap.html(html);

                    return this;

                },

                /**
                 * Fills the year container
                 */
                fillYears: function() {

                    var years = [this._date.year - this._yearsToShow];

                    for (var i = 1; i < 20; i++) {
                        years[i] = years[i - 1] + 1
                    }

                    this.yearsWrap.html(this.calendarItemTemplate('years', years));
                    this.selectItem('year');

                    return this;

                },

                /**
                 * Fills the header container based on date, month and _viewState
                 */
                fillHeader: function() {

                    var value = this._date.year;

                    if (this._viewState === 'days')
                        value = params.text.monthsFull[this._date.month] + ' ' + value;

                    if (this._viewState === 'years')
                        value = (value - this._yearsToShow) + ' - ' + (value + 21 - this._yearsToShow);

                    this.header.text(value);

                    return this;

                },

                /**
                 * Switches view between years, months and days
                 * Happens on header click or on year/month selection (in opposite directions)
                 * @param {boolean} isHeaderInvoked
                 */
                switchView: function(isHeaderInvoked) {

                    var oldViewState = this._viewState,
                        switchScenario = isHeaderInvoked
                            ? {
                                days: 'months',
                                months: 'years',
                                years: 'days'
                            }
                                : {
                                months: 'days',
                                years: 'months'
                            };

                    this._viewState = switchScenario[oldViewState];

                    this.content
                        .removeClass('calendar__content_view_' + oldViewState)
                        .addClass('calendar__content_view_' + this._viewState);

                    return this;

                },

                /**
                 * Flips content based on the clicked arrow direction
                 * @param {number} increment [1, -1] - increases or decreases day/month/year-to-show value
                 */
                flipContent: function(increment) {

                    // flip days
                    if (this._viewState === 'days') {
                        this._date.month += increment;

                        this.isEdgeMonth() && this.setNewYear();

                        this
                            .fillDays()
                            .fillHeader();
                    }

                    // flip single year (on months view)
                    if (this._viewState === 'months') {
                        this._date.year += increment;
                        this.fillHeader();
                    }

                    // flip years
                    if (this._viewState === 'years') {
                        this._date.year += increment * 20;

                        this
                            .fillYears()
                            .fillHeader();
                    }

                },

                /**
                 * Checks if the incremented month exists
                 * @returns {boolean}
                 */
                isEdgeMonth: function() {
                    return (this._date.month > 11 || this._date.month < 0);
                },

                /**
                 * Adjusts month and year in edge cases (switching between Dec/Jan)
                 */
                setNewYear: function() {

                    var isYearNew = this._date.month > 11;      // December -> January

                    isYearNew
                        ? this._date.year++
                        : this._date.year--;

                    this._date.month = isYearNew ? 0 : 11;

                },

                /**
                 * Checks if the selected date belongs to adjacent month and updates month if needed
                 * @param {object} target
                 * @returns {boolean}
                 */
                handleEdgeDate: function(target) {

                    var isNextMonth = target.hasClass('calendar__item_next_yes'),
                        isPrevMonth = target.hasClass('calendar__item_prev_yes');

                    isNextMonth && this._date.month++;
                    isPrevMonth && this._date.month--;

                    return (isNextMonth || isPrevMonth);

                },

                /**
                 * Highlights the selected month/year
                 * @param {string} appliedTo ['month', 'year']
                 */
                selectItem: function(appliedTo) {

                    var year = this._date.year,
                        month = false,
                        wrap = (appliedTo === 'month')
                            ? this.monthsWrap
                            : this.yearsWrap;

                    wrap.children('li').each(function(){

                        if (appliedTo === 'month') {
                            month = $(this).text();
                            // months aren't rendered every time, so old highlight has to be removed
                            $(this).removeClass('calendar__item_selected_yes');
                        }

                        if (appliedTo === 'year')
                            year = +$(this).text();

                        calendar.isSelected(year, month, false)
                            && $(this).addClass('calendar__item_selected_yes');

                    });

                    return this;

                },

                /**
                 * Checking if the date is selected
                 * @param {number} year
                 * @param {number} month
                 * @param {number} date
                 * @returns {boolean}
                 */
                isSelected: function(year, month, date) {

                    return (
                            (!year || year === this._dateOld.year) &&
                            (!month || month === params.text.months[this._dateOld.month]) &&
                            (!date || date === this._dateOld.date)
                        );

                },

                /**
                 * Highlighting the focused item on keyboard events
                 * @param {number} increment
                 */
                focusItem: function(increment) {

                    var focusedItem,
                        focusedItemIndex,
                        listWappers = {
                            days: this.datesWrap,
                            months: this.monthsWrap,
                            years: this.yearsWrap
                        },
                        activeItemsList = listWappers[this._viewState],
                        activeItemsCount = activeItemsList.find('li').length;

                    // focus starting point is defined by the selected item
                    // if there is no selected item (only possible on days view), start somewhere in the middle
                    focusedItem = $(
                        activeItemsList.children('.calendar__item_focused_yes')[0]
                            || activeItemsList.children('.calendar__item_selected_yes')[0]
                            || activeItemsList.children('.calendar__item')[12] // magic number
                    );

                    // new focus item has to be within the displayed
                    focusedItemIndex = this.checkFocusIndex(focusedItem.index() + increment, activeItemsCount);

                    // removes old focus
                    focusedItem.removeClass('calendar__item_focused_yes');

                    // sets new focus
                    activeItemsList
                        .find('li')
                        .eq(focusedItemIndex)
                        .addClass('calendar__item_focused_yes');

                },

                /**
                 * Handles focus getting out of the range
                 * @param {number} index
                 * @param {number} count
                 * @returns {number}
                 */
                checkFocusIndex: function(index, count) {

                    if (index > count - 1) {

                        index = this._viewState === 'days'
                            ? this.updateFocusMonth('next')
                            : 0;

                    } else if (index < 0) {

                        index = this._viewState === 'days'
                            ? this.updateFocusMonth('prev')
                            : -1;

                    }

                    return index;

                },

                /**
                 * Switches the month if date hits the wall on date view
                 * @param {string} direction ['prev', 'next']
                 * @returns {number}
                 */
                updateFocusMonth: function(direction) {

                    // triggers click on the corresponding arrow
                    this[direction].trigger('click');

                    return (direction === 'next') ? 0 : 41;

                },

                /**
                 * Triggers click on enter
                 */
                triggerClick: function() {

                    // uses :visible to target current view
                    var focusedItem = this.content.find('.calendar__item_focused_yes:visible');

                    focusedItem.length
                        && focusedItem.trigger('click');

                },

                /**
                 * Calendar template (without dates/years/header)
                 * @returns {string}
                 */
                calendarTemplate: function() {

                    return  '<div class="datepicker__calendar calendar">' +
                                '<div class="calendar__header">' +
                                    '<div class="calendar__button calendar__button_type_prev">&#x25C0;</div>' +
                                    '<div class="calendar__button calendar__button_type_next">&#x25B6;</div>' +
                                    '<div class="calendar__button calendar__button_type_current"></div>' +
                                '</div>' +

                                '<div class="calendar__content calendar__content_view_days">' +
                                    '<div class="calendar__days">' +
                                        '<ul>' +
                                            this.calendarItemTemplate('weekdays', params.text.weekdays) +
                                        '</ul>' +

                                        '<ul class="calendar__dates">' +

                                        '</ul>' +
                                    '</div>' +

                                    '<ul class="calendar__months">' +
                                        this.calendarItemTemplate('months', params.text.months) +
                                    '</ul>' +

                                    '<ul class="calendar__years">' +

                                    '</ul>' +
                                '</div>' +

                                '<div class="calendar__today">Today</div>' +
                            '</div>';

                },

                /**
                 * Item template with corresponding class names
                 * @param {String} type ['weekdays', 'months', 'years', 'days']
                 * @param {Array} values
                 * @param {String} mod
                 * @returns {string}
                 */
                calendarItemTemplate: function(type, values, mod) {

                    var html = '',
                        className = type === 'weekdays'
                            ? 'calendar__weekday'
                            : 'calendar__item';

                    if (mod)
                        className += ' calendar__item_' + mod + '_yes';

                    for (var i = 0; i < values.length; i++) {
                        html += '<li class="' + className + '">' + values[i] + '</li>'
                    }

                    return html;

                }

            },

            input = {

                initialize: function(target, instance) {

                    // reference to the currently open input
                    this._instance = instance;

                    this
                        .renderTemplates(target)
                        .findBlocks()
                        .bindEvents();

                },

                renderTemplates: function(target) {
                    target.replaceWith(this.inputTemplate());
                    return this;
                },

                findBlocks: function() {

                    this.input = $('.datepicker_instance_' + this._instance + ' .datepicker__input');
                    this.trigger = $('.datepicker_instance_' + this._instance + ' .datepicker__trigger');

                    return this;

                },

                bindEvents: function() {

                    this.trigger.on('click', this._onShowClick);

                    return this;

                },

                _onShowClick: function(e) {

                    var target = $(e.target);

                    // doesn't let calendar._onOutsideClick fire
                    e.stopPropagation();

                    calendar.show(
                        target.closest('.datepicker'),
                        input.parseValue(target.prev().val())
                    );

                },

                /**
                 * Parsing input value (ex. 'Oct 10 2014') to get date
                 * @param {string} value
                 * @returns {{date: number, month: number, year: number}}
                 */
                parseValue: function(value) {

                    var date = value.split(' ');

                    return {
                        date: +date[1],
                        month: $.inArray(date[0], params.text.months),
                        year: +date[2]
                    };

                },

                /**
                 * Sets value for the currently open input
                 * @param {object} date
                 * @param instance
                 */
                setValue: function(date, instance) {

                    var input = $('.datepicker_instance_' + instance + ' .datepicker__input'),
                        month = params.text.months[date.month],
                        day = date.date,
                        year = date.year;

                    input.val(month + ' ' + day + ' ' + year);

                },

                /**
                 * Input template (within a wrapper)
                 * @returns {string}
                 */
                inputTemplate: function() {

                    return  '<div class="datepicker datepicker_instance_' + this._instance + '">' +
                                '<input type="text" value="' +
                                    params.text.months[params.today.month] + ' ' +
                                    params.today.date + ' ' +
                                    params.today.year +
                                '" class="datepicker__input" />' +
                                '<div class="datepicker__trigger"></div>' +
                            '</div>';

                }

            },

            keyrouter = {

                initialize: function() {
                    $(window).on('keydown', this.bindKeys);
                },

                bindKeys: function(e) {

                    var keyCode = e.keyCode,
                        direction;

                    if (!calendar._isOpen)
                        return;

                    switch (keyCode) {
                        case 37:
                            direction = 'left';
                            break;
                        case 38:
                            direction = 'up';
                            break;
                        case 39:
                            direction = 'right';
                            break;
                        case 40:
                            direction = 'down';
                            break;
                        // enter
                        case 13:
                            calendar.triggerClick();
                            break;
                        // esc
                        case 27:
                            calendar.hide();
                            return;
                    }

                    keyrouter.handleArrows(direction);

                },

                /**
                 * Getting the increment (which depends on the arrow clicked and
                 * the number of items in a row for up/down shifts)
                 * @param {string} direction ['up', 'down', 'left', 'right']
                 */
                handleArrows: function(direction) {

                    var increment;

                    if (direction === 'left'){
                        increment = -1;
                    } else if (direction === 'right') {
                        increment = 1;
                    } else if (direction === 'up') {
                        increment = - this.getVerticalIncrement();
                    } else {
                        increment = this.getVerticalIncrement();
                    }

                    calendar.focusItem(increment);

                },

                /**
                 * Vertical increment depends on the number of items in a row ->
                 * _viewState has to be considered
                 */
                getVerticalIncrement: function() {

                    var rowLength = {
                            days: 7,
                            months: 3,
                            years: 4
                        };

                    return rowLength[calendar._viewState];

                }

            };


        calendar.initialize();
        keyrouter.initialize();

        return this.each(function(i) {
            input.initialize($(this), i + 1);
        });

    };

}(jQuery));
