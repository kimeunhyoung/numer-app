// Minimal safe fallback data to ensure app can boot while full data file is fixed.
window.NUMEROLOGY_DATA = window.NUMEROLOGY_DATA || {
    TITLE_MAP: {1:"1번",2:"2번",3:"3번",4:"4번",5:"5번",6:"6번",7:"7번",8:"8번",9:"9번",11:"11번",22:"22번"},
    TL_KEYWORD: {},
    TL_COLOR: {},
    TL_DESC: {},
    DEEP_MAP: {1:"[1번] 기본",2:"[2번] 기본",3:"[3번] 기본"},
    MOON_MAP: {},
    P_DETAIL: {},
    C_DETAIL: {},
    QUESTIONS: {},
    GROWTH_DATA: {},
    YEAR_STRATEGY: {},
    MONTHLY_KEYWORDS: {},
    DAY_ADVICE: {},
    DAILY_TIPS: {},
    LOSHU_STRENGTH_RULES: [],
    LOSHU_WEAKNESS_RULES: [],
    LOSHU_INTENSITY_RULES: [],
    INTERPRETATION_TEXTS: {},
    CHALLENGE_DATA: {},
    LOSHU_ARROWS: {},
    getZodiacInfo: function(m,d){ return {n:"미지", i:"✨", t:"데이터 없음"}; }
};

