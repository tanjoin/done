import LocalStorageHelper from "./local_storage_helper.js";

class FilterManager {
    static get hideNonTargetDay() {
        return LocalStorageHelper.getStoredBool('filter_hide_non_target_day', true);
    }
    static get hideOutOfTime() {
        return LocalStorageHelper.getStoredBool('filter_hide_out_of_time', false);
    }
    static get hideCompleted() {
        return LocalStorageHelper.getStoredBool('filter_hide_completed', false);
    }
    static get hideCancelled() {
        return LocalStorageHelper.getStoredBool('filter_hide_cancelled', false);
    }
}

export default FilterManager;