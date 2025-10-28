from enum import Enum

class UserRole(str, Enum):
    EMPLOYEE = "employee"
    HR_ADMIN = "hr_admin"
    EXECUTIVE = "executive"

class PreferenceCategory(str, Enum):
    ELECTRONICS = "electronics"
    FASHION = "fashion"
    BOOKS = "books"
    FOOD = "food"
    TRAVEL = "travel"
    FITNESS = "fitness"
    HOME = "home"
    ENTERTAINMENT = "entertainment"
    EDUCATION = "education"
    GIFT_CARDS = "gift_cards"
    JEWELRY = "jewelry"
    HEALTH_WELLNESS = "health_wellness"
    AUTOMOTIVE = "automotive"
    SPORTS = "sports"
    BEAUTY_PERSONAL_CARE = "beauty_personal_care"

class RewardType(str, Enum):
    PHYSICAL_PRODUCT = "physical_product"
    DIGITAL_PRODUCT = "digital_product"
    EXPERIENCE = "experience"
    GIFT_CARD = "gift_card"
    RECOGNITION = "recognition"
    VOUCHER = "voucher"
    CASH_REWARD = "cash_reward"

class AchievementType(str, Enum):
    PERFORMANCE_EXCELLENCE = "performance_excellence"
    INNOVATION = "innovation"
    TEAMWORK = "teamwork"
    LEADERSHIP = "leadership"
    CUSTOMER_SERVICE = "customer_service"
    SALES_TARGET = "sales_target"
    PROJECT_COMPLETION = "project_completion"
    ATTENDANCE = "attendance"
    MENTORING = "mentoring"
    COST_SAVING = "cost_saving"

class RecognitionType(str, Enum):
    PEER_TO_PEER = "peer_to_peer"
    MANAGER_TO_EMPLOYEE = "manager_to_employee"
    TEAM_RECOGNITION = "team_recognition"
    COMPANY_WIDE = "company_wide"
    MILESTONE = "milestone"
    SPOT_AWARD = "spot_award"