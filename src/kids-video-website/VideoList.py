#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re
import json
import requests
from bs4 import BeautifulSoup
import sys
import os

"""
获取B站视频集中所有集的名称列表和序号
使用方法：python VideoList.py <BV号> [输出JSON文件名]
例如：python VideoList.py BV1jbr5Y1E7P data/videos_output.json
"""

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
                'videos': videos
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
            
            video = {
                'id': index,
                'name': title,
                'bvid': bvid
            }
            videos.append(video)
        
        if videos:
            return {
                'title': main_title,
                'bvid': bvid,
                'videos': videos
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
                    'cid': page.get('cid')
                }
                videos.append(video)
            
            return {
                'title': 'Unknown Title',  # API不提供总标题
                'bvid': bvid,
                'videos': videos
            }
        
        # 如果所有方法都失败，返回一个空结果
        return {
            'title': 'Unknown Title',
            'bvid': bvid,
            'videos': []
        }
    
    except Exception as e:
        print(f"Error fetching video info: {e}")
        return {
            'title': 'Error',
            'bvid': bvid,
            'videos': [],
            'error': str(e)
        }

def save_to_json(data, filename):
    """将数据保存为JSON文件"""
    with open(filename, 'w', encoding='utf-8') as file:
        json.dump(data, file, ensure_ascii=False, indent=4)
    print(f"数据已保存到 {filename}")

def main():
    # 检查命令行参数
    if len(sys.argv) < 2:
        print("使用方法: python VideoList.py <BV号> [输出JSON文件名]")
        print("例如: python VideoList.py BV1jbr5Y1E7P videos_output.json")
        return
    
    # 获取BV号
    bvid = sys.argv[1]
    
    # 获取输出文件名（可选）
    output_file = sys.argv[2] if len(sys.argv) > 2 else f"{bvid}_videos.json"
    
    # 获取视频信息
    video_info = get_video_info(bvid)
    
    # 打印结果
    print(f"视频标题: {video_info['title']}")
    print(f"BV号: {video_info['bvid']}")
    print(f"找到 {len(video_info['videos'])} 个视频:")
    
    for i, video in enumerate(video_info['videos']):
        print(f"  {video['id']}. {video['name']}")
    
    # 保存结果
    save_to_json(video_info, output_file)

if __name__ == "__main__":
    main()
