from typing import TypedDict, List, Dict, Any, Annotated
import operator

def merge_dicts(a: Dict[str, Any], b: Dict[str, Any]) -> Dict[str, Any]:
    return {**a, **b}

class GenesisState(TypedDict):
    user_input: str
    current_data: Dict[str, Any]
    target_agents: list
    agent_outputs: Annotated[Dict[str, Any], merge_dicts]
    final_response: str
    
    # Skeleton fields
    story_formula: str
    volume1_goal: str
    golden_finger_rules: list
    core_hook: str
    emotional_tone: str
    
    # World fields (structured)
    world: Dict[str, Any]  # Comprehensive world structure including:
        # macro: {era, space_structure, civilization}
        # conflict: {main_contradiction, ultimate_goal}
        # power_system: {source, levels, cost, ceiling}
        # factions: [{name, stance, resources, relation_to_mc}]
        # economy: {currencies, acquisition, structure}
        # rules: {public_rules, hidden_rules, taboos}
        # history: {key_events, conflicting_stories}
        # space: {regions, dungeons}
        # information: {public_view, mc_view, truth, revelation_pace}
        # order_keepers: {surface_enemy, mid_enemy, top_enemy}
        # aesthetic: {visual_tags, emotional_tone, forbidden_styles}
        # mc_position: {cheat_nature, interested_parties, explanation_layers}
