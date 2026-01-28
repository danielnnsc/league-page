import { getLeagueTransactions, loadPlayers, getLeagueTeamManagers, getPreviousDrafts } from '$lib/utils/helper';

export async function load({ url, fetch }) {
    const show = url?.searchParams?.get('show');
    const query = url?.searchParams?.get('query');
    const curPage = url?.searchParams?.get('page');
    const team = url?.searchParams?.get('team');
    const season = url?.searchParams?.get('season');
    const view = url?.searchParams?.get('view');

    const transactionsData = getLeagueTransactions(false);
    const leagueTeamManagersData = getLeagueTeamManagers();
    const draftsData = getPreviousDrafts();

    const playersData = loadPlayers(fetch);

    const bannedValued = [
        'undefined',
    ]

    const props = {
        show: "all",
        query: "",
        playersData,
        transactionsData,
        draftsData,
        leagueTeamManagersData,
        page: 0,
        team: null,
        season: 'all',
        view: 'timeline',
    }
    if(show && (show == "all" || show == "trade" || show == "waiver" || show == "records" || show == "drafts")) {
        props.show = show;
    }
    if(query && !bannedValued.includes(query)) {
        props.query = query;
    }
    if(curPage && !isNaN(curPage)) {
        props.page = parseInt(curPage) - 1;
    }
    if(team && !isNaN(team)) {
        props.team = parseInt(team);
    }
    if(season && (season === 'all' || !isNaN(season))) {
        props.season = season === 'all' ? 'all' : parseInt(season);
    }
    if(view && (view === 'timeline' || view === 'compact')) {
        props.view = view;
    }
    return props;
}
