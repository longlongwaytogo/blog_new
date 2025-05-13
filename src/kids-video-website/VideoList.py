#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re
import json
import requests
from bs4 import BeautifulSoup
import sys
import os
import argparse

"""
获取B站视频集中所有集的名称列表和序号
使用方法：python VideoList.py <BV号> [输出JSON文件名] [类别] [子类别] [集合名称] [--collection]
例如：python VideoList.py BV1jbr5Y1E7P data/古诗.json 国学 古诗 "爱上古诗-黄龙老师"
使用 --collection 参数处理新版B站合集

合集：如：  VideoList.py <BV号> [输出JSON文件名] BV1Y22JYKExq --collection
"""

def get_ugc_season_info(bvid):
    """获取B站新版合集(ugc_season)信息，处理每个视频有不同BV号的情况"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://www.bilibili.com'
    }
    
    # 构建视频URL
    url = f'https://www.bilibili.com/video/{bvid}'
    
    try:
        # 获取页面内容
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        html_content = response.text
        
        # 提取视频信息
        initial_state_match = re.search(r'window\.__INITIAL_STATE__=(.+?);\(function', html_content)
        if not initial_state_match:
            print("无法从页面提取__INITIAL_STATE__数据")
            return None
            
        initial_state = json.loads(initial_state_match.group(1))
        
        # 确认是否包含ugc_season信息
        if 'videoData' not in initial_state or 'ugc_season' not in initial_state['videoData']:
            print("该视频不是合集或合集结构不兼容")
            return get_video_info(bvid)  # 回退到传统方式处理
            
        # 提取合集信息
        ugc_season = initial_state['videoData']['ugc_season']
        main_title = ugc_season.get('title', '未知合集')
        
        videos = []
        # 处理当前视频
        current_video = initial_state['videoData']
        videos.append({
            'id': 1,
            'name': current_video.get('title', '未知标题'),
            'bvid': current_video.get('bvid'),
            'cid': current_video.get('cid'),
            'duration': current_video.get('duration')
        })
        
        # 处理合集中的其他视频
        if 'sections' in ugc_season:
            video_index = 2  # 从2开始计数，因为1已用于当前视频
            for section in ugc_season['sections']:
                if 'episodes' in section:
                    for episode in section['episodes']:
                        # 如果与当前视频相同，则跳过
                        if episode.get('bvid') == current_video.get('bvid'):
                            continue
                            
                        # 获取视频详细信息
                        video_detail = get_video_detail(episode.get('bvid'))
                        
                        video = {
                            'id': video_index,
                            'name': episode.get('title', f'视频 {video_index}'),
                            'bvid': episode.get('bvid'),
                            'cid': video_detail.get('cid') if video_detail else None,
                            'duration': video_detail.get('duration') if video_detail else 0
                        }
                        videos.append(video)
                        video_index += 1
        
        if len(videos) > 0:
            return {
                'title': main_title,
                'bvid': bvid,  # 使用主BV号作为合集ID
                'videos': videos,
                'originalUrl': url,
                'episodeCount': len(videos)
            }
        else:
            # 如果没有找到视频，回退到传统处理方式
            return get_video_info(bvid)
            
    except Exception as e:
        print(f"获取合集信息时出错: {e}")
        return get_video_info(bvid)  # 回退到传统处理方式

def get_video_detail(bvid):
    """获取单个视频的详细信息"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        }
        api_url = f'https://api.bilibili.com/x/web-interface/view?bvid={bvid}'
        response = requests.get(api_url, headers=headers)
        data = response.json()
        
        if data.get('code') == 0 and 'data' in data:
            video_data = data['data']
            return {
                'cid': video_data.get('cid'),
                'duration': video_data.get('duration')
            }
        return None
    except Exception as e:
        print(f"获取视频详情出错 {bvid}: {e}")
        return None

def get_video_info(bvid):
    """获取视频信息，包括分P信息"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://www.bilibili.com'
    }
    
    # 构建视频URL
    url = f'https://www.bilibili.com/video/{bvid}'
    
    try:
        # 获取页面内容
        response = requests.get(url, headers=headers)
        response.raise_for_status()  # 如果请求失败则抛出异常
        html_content = response.text
        
        # 提取视频信息
        # 方法1：从页面的JSON数据中提取
        initial_state_match = re.search(r'window.__INITIAL_STATE__=(.+?);\(function', html_content)
        if initial_state_match:
            initial_state = json.loads(initial_state_match.group(1))
            
            # 提取视频标题和bvid
            video_data = initial_state.get('videoData', {})
            main_title = video_data.get('title', 'Unknown Title')
            bvid = video_data.get('bvid', bvid)
            
            # 提取分集信息
            pages = video_data.get('pages', [])
            
            videos = []
            for i, page in enumerate(pages):
                video = {
                    'id': page.get('page', i + 1),
                    'name': page.get('part', f'P{page.get("page", i + 1)}'),
                    'bvid': bvid,
                    'cid': page.get('cid'),
                    'duration': page.get('duration')
                }
                videos.append(video)
            
            return {
                'title': main_title,
                'bvid': bvid,
                'videos': videos,
                'originalUrl': url,
                'episodeCount': len(videos)
            }
        
        # 方法2：使用BeautifulSoup解析网页
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # 获取视频标题
        title_element = soup.select_one('h1.video-title')
        main_title = title_element.text.strip() if title_element else 'Unknown Title'
        
        # 获取分集列表
        episode_list = soup.select('ul.list-box li.list-item')
        
        if not episode_list:
            # 尝试其他选择器找到分集列表
            episode_list = soup.select('.ep-list .ep-item')
        
        videos = []
        for i, episode in enumerate(episode_list):
            # 尝试从不同的元素获取标题
            title_element = episode.select_one('.part') or episode.select_one('.ep-title')
            title = title_element.text.strip() if title_element else f'P{i+1}'
            
            # 获取视频序号
            index = i + 1
            index_attr = episode.get('data-page')
            if index_attr:
                try:
                    index = int(index_attr)
                except ValueError:
                    pass
            
            # 尝试获取时长信息
            duration_element = episode.select_one('.duration')
            duration = None
            if duration_element:
                duration_text = duration_element.text.strip()
                # 将分:秒格式转换为秒数
                try:
                    if ':' in duration_text:
                        minutes, seconds = duration_text.split(':')
                        duration = int(minutes) * 60 + int(seconds)
                    else:
                        duration = int(duration_text)
                except ValueError:
                    pass
            
            video = {
                'id': index,
                'name': title,
                'bvid': bvid,
                'duration': duration
            }
            videos.append(video)
        
        if videos:
            return {
                'title': main_title,
                'bvid': bvid,
                'videos': videos,
                'originalUrl': url,
                'episodeCount': len(videos)
            }
        
        # 如果以上方法都失败，尝试直接使用API获取
        api_url = f'https://api.bilibili.com/x/player/pagelist?bvid={bvid}'
        api_response = requests.get(api_url, headers=headers)
        api_data = api_response.json()
        
        if api_data.get('code') == 0:
            pages = api_data.get('data', [])
            videos = []
            for i, page in enumerate(pages):
                video = {
                    'id': page.get('page', i + 1),
                    'name': page.get('part', f'P{page.get("page", i + 1)}'),
                    'bvid': bvid,
                    'cid': page.get('cid'),
                    'duration': 0  # API不一定提供时长，设为默认值
                }
                videos.append(video)
            
            return {
                'title': 'Unknown Title',  # API不提供总标题
                'bvid': bvid,
                'videos': videos,
                'originalUrl': url,
                'episodeCount': len(videos)
            }
        
        # 如果所有方法都失败，返回一个空结果
        return {
            'title': 'Unknown Title',
            'bvid': bvid,
            'videos': [],
            'originalUrl': url,
            'episodeCount': 0
        }
    
    except Exception as e:
        print(f"Error fetching video info: {e}")
        return {
            'title': 'Error',
            'bvid': bvid,
            'videos': [],
            'error': str(e),
            'originalUrl': url,
            'episodeCount': 0
        }

def get_bangumi_info(season_id):
    """获取B站番剧/剧集信息"""
    api_url = f'https://api.bilibili.com/pgc/view/web/season?season_id={season_id}'
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': f'https://www.bilibili.com/bangumi/play/ss{season_id}'
    }
    try:
        response = requests.get(api_url, headers=headers)
        data = response.json()
        if data.get('code') == 0 and 'result' in data:
            result = data['result']
            title = result.get('title', '未知番剧')
            episodes = result.get('episodes', [])
            videos = []
            for i, ep in enumerate(episodes):
                videos.append({
                    'id': i + 1,
                    'name': ep.get('long_title') or ep.get('title') or f'第{i+1}集',
                    'bvid': ep.get('bvid'),
                    'cid': ep.get('cid'),
                    'duration': ep.get('duration', 0)
                })
            return {
                'title': title,
                'bvid': f'ss{season_id}',
                'videos': videos,
                'originalUrl': f'https://www.bilibili.com/bangumi/play/ss{season_id}',
                'episodeCount': len(videos)
            }
        else:
            print("未能获取到番剧信息")
            return None
    except Exception as e:
        print(f"获取番剧信息时出错: {e}")
        return None

def save_to_json(data, filename, category=None, subcategory=None, collection_name=None):
    """将数据保存为JSON文件，按照videos.json中的格式"""
    # 如果提供了类别信息，则构建嵌套结构
    if category and subcategory and collection_name:
        # 检查文件是否已存在
        existing_data = {}
        if os.path.exists(filename):
            try:
                with open(filename, 'r', encoding='utf-8') as file:
                    existing_data = json.load(file)
            except json.JSONDecodeError:
                print(f"警告: 文件 {filename} 存在但不是有效的JSON，将被覆盖。")
        
        # 确保嵌套结构存在
        if category not in existing_data:
            existing_data[category] = {}
        if subcategory not in existing_data[category]:
            existing_data[category][subcategory] = {}
        
        # 添加或更新集合
        formatted_data = {
            'videos': data['videos'],
            'originalUrl': data['originalUrl'],
            'episodeCount': data['episodeCount']
        }
        
        existing_data[category][subcategory][collection_name] = formatted_data
        
        # 保存更新后的数据
        with open(filename, 'w', encoding='utf-8') as file:
            json.dump(existing_data, file, ensure_ascii=False, indent=4)
    else:
        # 如果没有提供类别信息，则保存原始结构
        with open(filename, 'w', encoding='utf-8') as file:
            json.dump(data, file, ensure_ascii=False, indent=4)
    
    print(f"数据已保存到 {filename}")

def main():
    # 创建命令行参数解析器
    parser = argparse.ArgumentParser(description='获取B站视频信息')
    parser.add_argument('bvid', help='视频的BV号')
    parser.add_argument('output', nargs='?', help='输出JSON文件名', default=None)
    parser.add_argument('category', nargs='?', help='分类', default=None)
    parser.add_argument('subcategory', nargs='?', help='子分类', default=None)
    parser.add_argument('collection_name', nargs='?', help='合集名称', default=None)
    parser.add_argument('--collection', action='store_true', help='是否处理新版合集')
    
    # 解析命令行参数
    try:
        args = parser.parse_args()
        
        bvid = args.bvid
        output_file = args.output if args.output else f"{bvid}_videos.json"
        category = args.category
        subcategory = args.subcategory
        collection_name = args.collection_name
        is_collection = args.collection
        
    except SystemExit:
        # 如果argparse抛出退出异常，回退到传统参数处理方式
        print("使用传统命令行参数处理方式")
        
        # 检查命令行参数
        if len(sys.argv) < 2:
            print("使用方法: python VideoList.py <BV号> [输出JSON文件名] [类别] [子类别] [集合名称]")
            print("例如: python VideoList.py BV1jbr5Y1E7P data/古诗.json 国学 古诗 \"爱上古诗-黄龙老师\"")
            print("使用 --collection 参数处理新版B站合集")
            return
        
        # 获取BV号
        bvid = sys.argv[1]
        
        # 获取输出文件名（可选）
        output_file = sys.argv[2] if len(sys.argv) > 2 else f"{bvid}_videos.json"
        
        # 获取类别信息（可选）
        category = sys.argv[3] if len(sys.argv) > 3 else None
        subcategory = sys.argv[4] if len(sys.argv) > 4 else None
        collection_name = sys.argv[5] if len(sys.argv) > 5 else None
        
        # 检查是否有--collection参数
        is_collection = '--collection' in sys.argv
    
    # 获取视频信息
    if re.match(r'^ss\d+$', bvid):
        season_id = bvid[2:]
        video_info = get_bangumi_info(season_id)
    elif re.match(r'^https://www\.bilibili\.com/bangumi/play/ss(\d+)', bvid):
        season_id = re.findall(r'ss(\d+)', bvid)[0]
        video_info = get_bangumi_info(season_id)
    else:
        video_info = get_ugc_season_info(bvid) if is_collection else get_video_info(bvid)
    
    if video_info is None:
        print("未能获取到视频信息，请检查BV号或网络连接。")
        return
    print(f"视频标题: {video_info['title']}")
    print(f"BV号: {video_info['bvid']}")
    print(f"找到 {len(video_info['videos'])} 个视频:")
    
    for video in video_info['videos']:
        print(f"  {video['id']}. {video['name']}")
    
    # 保存结果
    save_to_json(video_info, output_file, category, subcategory, collection_name)

if __name__ == "__main__":
    main()
